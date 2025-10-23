import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

interface EnsureUserResponse {
  success: boolean;
  created?: boolean;
  error?: string;
}

/**
 * @param POST Assure que l'utilisateur courant existe dans la table `users`
 *
 * Utilisé pendant le flux magic link afin d'éviter les boucles où le client
 * est connecté côté Auth mais ne trouve pas encore sa ligne dans `users`.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({} as any));
    const invitationToken: string | undefined = payload?.invitationToken;
    const profileFirstName: string | undefined = payload?.firstName;
    const profileLastName: string | undefined = payload?.lastName;
    // Auth via Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json<EnsureUserResponse>(
        { success: false, error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json<EnsureUserResponse>(
        { success: false, error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    // Vérifier existence dans `users`
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("users")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle();

    if (existErr) {
      // Ne pas exposer l'erreur PostgREST brute
      console.error("ensure-user: erreur select users:", existErr);
    }

    if (existing?.uid) {
      // L'utilisateur existe, mettre à jour les informations si fournies
      if (profileFirstName || profileLastName) {
        const { error: updateErr } = await supabaseAdmin
          .from("users")
          .update({
            first_name:
              profileFirstName ?? user.user_metadata?.first_name ?? "",
            last_name: profileLastName ?? user.user_metadata?.last_name ?? "",
          })
          .eq("uid", user.id);

        if (updateErr) {
          console.error("ensure-user: erreur update users:", updateErr);
        }
      }
      return NextResponse.json<EnsureUserResponse>({
        success: true,
        created: false,
      });
    }

    // Déterminer le rôle applicatif et company_id à attribuer
    let appRole: string = "expediteur";
    let companyId: string | null = null;

    if (invitationToken) {
      try {
        const { data: invitation } = await supabaseAdmin
          .from("company_invitations")
          .select("invited_by, company_id")
          .eq("token", invitationToken)
          .maybeSingle();

        if (invitation) {
          // Récupérer la company_id de l'invitation
          companyId = invitation.company_id;

          // Hériter du rôle de l'invitant si possible
          if (invitation.invited_by) {
            const { data: inviter } = await supabaseAdmin
              .from("users")
              .select("role")
              .eq("uid", invitation.invited_by as string)
              .maybeSingle();
            if (inviter?.role === "transporteur") appRole = "transporteur";
          }
        }
      } catch (error) {
        console.error("ensure-user: erreur récupération invitation:", error);
      }
    }

    const userEmail = user.email ?? "";
    const { error: insertErr } = await supabaseAdmin.from("users").insert({
      uid: user.id,
      email: userEmail,
      role: appRole,
      first_name: profileFirstName ?? user.user_metadata?.first_name ?? "",
      last_name: profileLastName ?? user.user_metadata?.last_name ?? "",
      company_id: companyId,
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error("ensure-user: erreur insert users:", insertErr);
      return NextResponse.json<EnsureUserResponse>(
        { success: false, error: "Impossible de créer le profil utilisateur" },
        { status: 500 }
      );
    }

    return NextResponse.json<EnsureUserResponse>({
      success: true,
      created: true,
    });
  } catch (error) {
    console.error("ensure-user: erreur inconnue:", error);
    return NextResponse.json<EnsureUserResponse>(
      { success: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
