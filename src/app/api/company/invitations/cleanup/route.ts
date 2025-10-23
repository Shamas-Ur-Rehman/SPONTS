import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

/**
 * @param POST - Nettoyer les invitations invalides
 * 
 * Supprime ou met à jour les invitations sans token valide
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token d'authentification manquant" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token d'authentification invalide" }, { status: 401 });
    }

    // Récupérer l'entreprise et les droits avec supabaseAdmin
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Aucune entreprise associée" },
        { status: 404 }
      );
    }

    // Vérifier les droits
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Droits insuffisants" },
        { status: 403 }
      );
    }

    console.log("🧹 Nettoyage des invitations pour l'entreprise:", membership.company_id);

    // Récupérer toutes les invitations en attente sans token valide
    const { data: invalidInvitations, error: fetchError } = await supabaseAdmin
      .from("company_invitations")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("status", "pending")
      .is("token", null);

    if (fetchError) {
      console.error("Erreur récupération invitations:", fetchError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des invitations" },
        { status: 500 }
      );
    }

    console.log("🔍 Invitations sans token trouvées:", invalidInvitations?.length || 0);

    let updatedCount = 0;
    let deletedCount = 0;

    if (invalidInvitations && invalidInvitations.length > 0) {
      // Générer des tokens pour les invitations existantes ou les supprimer
      const { email } = await request.json().catch(() => ({}));

      if (email) {
        // Si un email est spécifié, mettre à jour uniquement cette invitation
        const targetInvitation = invalidInvitations.find(inv => inv.email.toLowerCase() === email.toLowerCase());
        
        if (targetInvitation) {
          const newToken = crypto.randomUUID();
          const { error: updateError } = await supabaseAdmin
            .from("company_invitations")
            .update({
              token: newToken,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", targetInvitation.id);

          if (!updateError) {
            updatedCount = 1;
            console.log("✅ Token généré pour invitation:", { email, token: newToken });
          }
        }
      } else {
        // Supprimer toutes les invitations sans token
        const { error: deleteError } = await supabaseAdmin
          .from("company_invitations")
          .delete()
          .eq("company_id", membership.company_id)
          .eq("status", "pending")
          .is("token", null);

        if (!deleteError) {
          deletedCount = invalidInvitations.length;
          console.log("🗑️ Invitations supprimées:", deletedCount);
        }
      }
    }

    return NextResponse.json({
      message: "Nettoyage effectué avec succès",
      updated: updatedCount,
      deleted: deletedCount,
      found: invalidInvitations?.length || 0,
    });

  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
