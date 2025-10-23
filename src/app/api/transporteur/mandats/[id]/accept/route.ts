import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../../supabase/supabase-admin";
import { supabase } from "../../../../../../../supabase/supabase";

/**
 * @param API Route pour accepter un mandat par un transporteur
 *
 * Vérifie les autorisations et assigne le mandat au transporteur de manière atomique
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== DÉBUT API ACCEPT MANDAT TRANSPORTEUR ===");

    const { id } = await params;
    console.log("Mandat ID:", id);

    const mandatId = parseInt(id);
    if (isNaN(mandatId)) {
      return NextResponse.json(
        { error: "ID de mandat invalide" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur depuis les headers (middleware auth)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token d'authentification requis" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Vérifier l'utilisateur
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("❌ Erreur authentification:", authError);
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    console.log("Utilisateur authentifié:", user.id);

    // Vérifier que l'utilisateur est membre d'une entreprise transporteur
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select(
        `
        company_id,
        company:companies(type, status)
      `
      )
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.error("❌ Utilisateur non membre d'entreprise:", membershipError);
      return NextResponse.json(
        { error: "Vous devez être membre d'une entreprise transporteur" },
        { status: 403 }
      );
    }

    const company = membership.company as any;
    if (company.type !== "transporteur") {
      console.error("❌ Entreprise non transporteur:", company.type);
      return NextResponse.json(
        { error: "Votre entreprise doit être de type transporteur" },
        { status: 403 }
      );
    }

    if (company.status !== "approved") {
      console.error("❌ Entreprise non approuvée:", company.status);
      return NextResponse.json(
        {
          error:
            "Votre entreprise doit être approuvée pour accepter des mandats",
        },
        { status: 403 }
      );
    }

    console.log("✅ Vérifications d'autorisation passées");

    // Vérifier que le mandat existe et est disponible
    const { data: mandat, error: mandatError } = await supabaseAdmin
      .from("mandats")
      .select("*")
      .eq("id", mandatId)
      .eq("status", "approved")
      .is("transporteur_company_id", null)
      .single();

    if (mandatError || !mandat) {
      if (mandatError?.code === "PGRST116") {
        console.error("❌ Mandat non trouvé ou déjà assigné");
        return NextResponse.json(
          { error: "Mandat non trouvé ou déjà assigné à un transporteur" },
          { status: 404 }
        );
      }
      console.error("❌ Erreur récupération mandat:", mandatError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération du mandat" },
        { status: 500 }
      );
    }

    console.log("✅ Mandat disponible trouvé");

    // Mise à jour atomique du mandat
    const { data: updatedMandat, error: updateError } = await supabaseAdmin
      .from("mandats")
      .update({
        transporteur_company_id: membership.company_id,
        transporteur_company_user: user.id,
        transporteur_status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandatId)
      .eq("status", "approved")
      .is("transporteur_company_id", null)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erreur mise à jour mandat:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de l'acceptation du mandat" },
        { status: 500 }
      );
    }

    if (!updatedMandat) {
      console.error("❌ Mandat non mis à jour (concurrence)");
      return NextResponse.json(
        { error: "Le mandat a déjà été accepté par un autre transporteur" },
        { status: 409 }
      );
    }

    console.log("✅ Mandat accepté avec succès");

    console.log("=== SUCCÈS API ACCEPT MANDAT TRANSPORTEUR ===");
    return NextResponse.json({
      success: true,
      mandat: updatedMandat,
      message: "Mandat accepté avec succès",
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API accept mandat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
