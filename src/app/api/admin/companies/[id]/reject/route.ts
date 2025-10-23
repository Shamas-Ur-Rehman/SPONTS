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
    console.log(
      "🚀 API admin/companies/reject - Début pour company:",
      params.id
    );

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
      console.log("❌ Admin reject company: Session invalide");
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
      console.log(`🚫 Admin reject: Accès refusé pour ${userEmail}`);
      return NextResponse.json(
        {
          success: false,
          error: "Accès non autorisé",
        } as AdminDecisionResponse,
        { status: 403 }
      );
    }

    // Récupérer la company pour vérification
    const { data: company, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("id, name, billing_email, status, created_by")
      .eq("id", params.id)
      .single();

    if (fetchError || !company) {
      console.error("❌ Company non trouvée:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Entreprise non trouvée",
        } as AdminDecisionResponse,
        { status: 404 }
      );
    }

    if (company.status !== "pending") {
      console.log(
        `⚠️ Company ${params.id} déjà traitée (status: ${company.status})`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cette entreprise a déjà été traitée",
        } as AdminDecisionResponse,
        { status: 400 }
      );
    }

    /**
     * @param Rejet de l'entreprise
     *
     * Met à jour le status à 'rejected' et enregistre le motif de rejet
     */
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        status: "rejected",
        rejection_reason: reason || "Motif non spécifié",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id, name, billing_email, status, updated_at")
      .single();

    if (updateError) {
      console.error("❌ Erreur lors du rejet:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors du rejet",
        } as AdminDecisionResponse,
        { status: 500 }
      );
    }

    console.log(
      `❌ Company ${params.id} rejetée par ${userEmail}. Motif: ${reason}`
    );

    // Envoyer notification email à l'entreprise
    try {
      // Récupérer les infos du créateur pour la notification
      const { data: creator } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, email")
        .eq("uid", company.created_by)
        .single();

      if (creator) {
        const { EmailService } = await import("@/lib/email");

        const emailData = EmailService.generateCompanyRejectionEmail(
          company.name,
          company.billing_email,
          `${creator.first_name} ${creator.last_name}`,
          reason || "Motif non spécifié"
        );

        await EmailService.sendEmail(emailData);

        console.log(`📧 Email de rejet envoyé à ${company.billing_email}`);
      }
    } catch (emailError) {
      console.warn("⚠️ Erreur envoi email (non bloquant):", emailError);
      // L'erreur d'email ne doit pas faire échouer le rejet
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCompany.id,
        status: updatedCompany.status,
        updated_at: updatedCompany.updated_at,
      },
    } as AdminDecisionResponse);
  } catch (error) {
    console.error("💥 Erreur admin reject company:", error);
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
