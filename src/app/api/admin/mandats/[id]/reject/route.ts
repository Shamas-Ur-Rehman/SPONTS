import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { AdminDecisionRequest, AdminDecisionResponse } from "@/types/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log("🚀 API admin/mandats/reject - Début pour mandat:", params.id);

    const mandatId = parseInt(params.id);
    if (isNaN(mandatId)) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de mandat invalide",
        } as AdminDecisionResponse,
        { status: 400 }
      );
    }

    // Récupérer les données de la requête
    const body: AdminDecisionRequest = await request.json();
    const { reason } = body;

    // Vérification de l'authentification et des privilèges admin
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.log("❌ Admin reject mandat: Session invalide");
      return NextResponse.json(
        { success: false, error: "Session invalide" } as AdminDecisionResponse,
        { status: 401 }
      );
    }

    // Vérifier les privilèges admin
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS;
    if (!adminEmails) {
      console.error("❌ SPONTIS_ADMIN_EMAILS non configuré");
      return NextResponse.json(
        {
          success: false,
          error: "Configuration admin manquante",
        } as AdminDecisionResponse,
        { status: 500 }
      );
    }

    const allowedEmails = adminEmails
      .split(",")
      .map((email) => email.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();

    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`🚫 Admin reject mandat: Accès refusé pour ${userEmail}`);
      return NextResponse.json(
        {
          success: false,
          error: "Accès non autorisé",
        } as AdminDecisionResponse,
        { status: 403 }
      );
    }

    // Récupérer le mandat pour vérification
    const { data: mandat, error: fetchError } = await supabaseAdmin
      .from("mandats")
      .select("id, status, created_by, company_id, payload")
      .eq("id", mandatId)
      .single();

    if (fetchError || !mandat) {
      console.error("❌ Mandat non trouvé:", fetchError);
      return NextResponse.json(
        { success: false, error: "Mandat non trouvé" } as AdminDecisionResponse,
        { status: 404 }
      );
    }

    // Vérifier que le mandat est en attente
    const currentStatus = mandat.status || "pending"; // Par défaut pending si null
    if (currentStatus !== "pending") {
      console.log(
        `⚠️ Mandat ${mandatId} déjà traité (status: ${currentStatus})`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Ce mandat a déjà été traité",
        } as AdminDecisionResponse,
        { status: 400 }
      );
    }

    /**
     * @param Rejet du mandat
     *
     * Met à jour le status à 'rejected' et enregistre le motif de rejet
     */
    const { data: updatedMandat, error: updateError } = await supabaseAdmin
      .from("mandats")
      .update({
        status: "rejected",
        rejection_reason: reason || "Motif non spécifié",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandatId)
      .select("id, status, updated_at")
      .single();

    if (updateError) {
      console.error("❌ Erreur lors du rejet du mandat:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors du rejet",
        } as AdminDecisionResponse,
        { status: 500 }
      );
    }

    console.log(
      `❌ Mandat ${mandatId} rejeté par ${userEmail}. Motif: ${reason}`
    );

    // Envoyer notification email au créateur du mandat
    try {
      // Récupérer les infos du créateur pour la notification
      const { data: creator } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, email")
        .eq("uid", mandat.created_by)
        .single();

      if (creator && mandat.payload) {
        const { EmailService } = await import("@/lib/email");

        const emailData = EmailService.generateMandatRejectionEmail(
          mandat.payload.nom || "Sans titre",
          creator.email,
          `${creator.first_name} ${creator.last_name}`,
          reason || "Motif non spécifié",
          {
            description: mandat.payload.description,
            depart: mandat.payload.adresse_depart?.adresse || "",
            arrivee: mandat.payload.adresse_arrivee?.adresse || "",
            heure: mandat.payload.heure_souhaitee,
          }
        );

        await EmailService.sendEmail(emailData);

        console.log(`📧 Email de rejet envoyé à ${creator.email}`);
      }
    } catch (emailError) {
      console.warn("⚠️ Erreur envoi email (non bloquant):", emailError);
      // L'erreur d'email ne doit pas faire échouer le rejet
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedMandat.id.toString(),
        status: updatedMandat.status,
        updated_at: updatedMandat.updated_at,
      },
    } as AdminDecisionResponse);
  } catch (error) {
    console.error("💥 Erreur admin reject mandat:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      } as AdminDecisionResponse,
      { status: 500 }
    );
  }
}
