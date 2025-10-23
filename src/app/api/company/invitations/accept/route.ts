import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { verifyAuthentication } from "@/lib/auth-middleware";

/**
 * @param POST - Accepter une invitation
 *
 * Version optimisée : utilise ensure-user et la nouvelle architecture FK
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token d'invitation requis" },
        { status: 400 }
      );
    }

    // Vérifier l'authentification
    const authResult = await verifyAuthentication(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const user = authResult.user!;

    // Récupérer et valider l'invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("company_invitations")
      .select(`*, company:companies(id, name)`)
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invitation invalide ou expirée" },
        { status: 404 }
      );
    }

    // Vérifications de base
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Cette invitation est ${invitation.status}` },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from("company_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "Cette invitation a expiré" },
        { status: 400 }
      );
    }

    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Cette invitation n'est pas pour votre email" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const { data: existingMembership } = await supabaseAdmin
      .from("company_members")
      .select("id")
      .eq("company_id", invitation.company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      await supabaseAdmin
        .from("company_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "Vous êtes déjà membre de cette entreprise" },
        { status: 400 }
      );
    }

    // S'assurer que l'utilisateur existe dans public.users avec ensure-user
    console.log("🔄 Appel ensure-user pour garantir la cohérence...");
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const ensureResponse = await fetch(`${baseUrl}/api/auth/ensure-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("authorization") || "",
      },
      body: JSON.stringify({
        invitationToken: token,
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
      }),
    });

    if (!ensureResponse.ok) {
      console.error("❌ Erreur ensure-user:", await ensureResponse.text());
      return NextResponse.json(
        { error: "Erreur lors de la préparation du profil utilisateur" },
        { status: 500 }
      );
    }

    // Créer le membership et mettre à jour les FK
    try {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("company_members")
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        })
        .select()
        .single();

      if (membershipError) {
        throw membershipError;
      }

      // Mettre à jour les FK dans public.users (cohérence avec la nouvelle architecture)
      console.log("🔗 Mise à jour des FK dans public.users...");
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({
          company_id: invitation.company_id,
          company_members: membership.id,
          updated_at: new Date().toISOString(),
        })
        .eq("uid", user.id);

      if (updateUserError) {
        console.error("⚠️ Erreur mise à jour FK:", updateUserError);
        // Rollback le membership en cas d'erreur FK
        await supabaseAdmin
          .from("company_members")
          .delete()
          .eq("id", membership.id);
        throw updateUserError;
      }

      // Marquer l'invitation comme acceptée
      await supabaseAdmin
        .from("company_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      console.log(
        "✅ Invitation acceptée avec succès - Architecture FK cohérente"
      );

      return NextResponse.json({
        message: "Invitation acceptée avec succès",
        membership,
        company: invitation.company,
        shouldClearFlags: true,
      });
    } catch (transactionError) {
      console.error("❌ Erreur transaction:", transactionError);
      return NextResponse.json(
        { error: "Erreur lors de l'acceptation de l'invitation" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
