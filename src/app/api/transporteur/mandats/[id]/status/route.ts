import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../../supabase/supabase-admin";
import { supabase } from "../../../../../../../supabase/supabase";
import { TransporteurStatus } from "@/types/mandat";

/**
 * @param API Route pour mettre à jour le statut d'un mandat par le transporteur
 *
 * Permet au transporteur de changer le statut d'un mandat qu'il a accepté
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== DÉBUT API UPDATE STATUS TRANSPORTEUR ===");

    const { id } = await params;
    console.log("Mandat ID:", id);

    const mandatId = parseInt(id);
    if (isNaN(mandatId)) {
      return NextResponse.json(
        { error: "ID de mandat invalide" },
        { status: 400 }
      );
    }

    // Récupérer le nouveau statut depuis le body
    const { status } = await request.json();

    // Validation du statut
    const validStatuses: TransporteurStatus[] = [
      "accepted",
      "picked_up",
      "delivered",
      "delivery_problem",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Statut invalide. Statuts autorisés: accepted, picked_up, delivered, delivery_problem",
        },
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

    // Vérifier que l'utilisateur est membre de l'entreprise transporteur assignée au mandat
    const { data: mandat, error: mandatError } = await supabaseAdmin
      .from("mandats")
      .select(
        `
        *,
        transporteur_company:companies!mandats_transporteur_company_id_fkey(id, type)
      `
      )
      .eq("id", mandatId)
      .not("transporteur_company_id", "is", null)
      .single();

    if (mandatError || !mandat) {
      console.error("❌ Mandat non trouvé ou non assigné:", mandatError);
      return NextResponse.json(
        { error: "Mandat non trouvé ou non assigné à un transporteur" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est membre de l'entreprise transporteur
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", mandat.transporteur_company_id)
      .single();

    if (membershipError || !membership) {
      console.error(
        "❌ Utilisateur non autorisé à modifier ce mandat:",
        membershipError
      );
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce mandat" },
        { status: 403 }
      );
    }

    console.log("✅ Vérifications d'autorisation passées");

    // Mise à jour du statut
    const { data: updatedMandat, error: updateError } = await supabaseAdmin
      .from("mandats")
      .update({
        transporteur_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandatId)
      .eq("transporteur_company_id", membership.company_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erreur mise à jour statut:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du statut" },
        { status: 500 }
      );
    }

    if (!updatedMandat) {
      console.error("❌ Mandat non mis à jour");
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du statut" },
        { status: 500 }
      );
    }

    console.log("✅ Statut mis à jour avec succès:", status);

    console.log("=== SUCCÈS API UPDATE STATUS TRANSPORTEUR ===");
    return NextResponse.json({
      success: true,
      mandat: updatedMandat,
      message: `Statut mis à jour vers ${status}`,
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API update status:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
