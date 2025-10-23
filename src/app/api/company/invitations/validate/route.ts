import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";

/**
 * @param POST - Valider un token d'invitation
 * 
 * Vérifie si le token d'invitation est valide et retourne les données de l'invitation
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

    console.log("🔍 Validation du token d'invitation:", token);

    // Récupérer l'invitation avec les données de l'entreprise
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("company_invitations")
      .select(`
        *,
        company:companies(name)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitation) {
      console.log("❌ Token d'invitation invalide ou expiré");
      return NextResponse.json(
        { error: "Token d'invitation invalide ou expiré" },
        { status: 404 }
      );
    }

    // Vérifier si l'invitation n'a pas expiré
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log("❌ Invitation expirée");
      return NextResponse.json(
        { error: "Cette invitation a expiré" },
        { status: 400 }
      );
    }

    console.log("✅ Token d'invitation valide");

    // Récupérer le nom de l'inviteur dans une requête séparée
    let invitedByName = "Un membre de l'équipe";
    if (invitation.invited_by) {
      try {
        const { data: inviterUser } = await supabaseAdmin
          .from("users")
          .select("first_name, last_name")
          .eq("uid", invitation.invited_by)
          .single();
        
        if (inviterUser && inviterUser.first_name) {
          invitedByName = `${inviterUser.first_name} ${inviterUser.last_name || ""}`.trim();
        }
      } catch (error) {
        console.log("⚠️ Impossible de récupérer le nom de l'inviteur:", error);
      }
    }

    return NextResponse.json({
      token: invitation.token,
      company_name: invitation.company?.name || "l'entreprise",
      role: invitation.role,
      invited_by_name: invitedByName,
      email: invitation.email,
    });

  } catch (error) {
    console.error("Erreur validation invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la validation de l'invitation" },
      { status: 500 }
    );
  }
}
