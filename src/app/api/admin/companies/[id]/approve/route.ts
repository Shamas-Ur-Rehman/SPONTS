import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { AdminDecisionResponse } from "@/types/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log(
      "🚀 API admin/companies/approve - Début pour company:",
      params.id
    );

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
      console.log("❌ Admin approve company: Session invalide");
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
      console.log(`🚫 Admin approve: Accès refusé pour ${userEmail}`);
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
     * @param Approbation de l'entreprise
     *
     * Met à jour le status à 'approved' et nettoie le motif de rejet s'il existait
     */
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        status: "approved",
        rejection_reason: null, // Nettoyer le motif de rejet précédent s'il existait
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id, name, billing_email, status, updated_at")
      .single();

    if (updateError) {
      console.error("❌ Erreur lors de l'approbation:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de l'approbation",
        } as AdminDecisionResponse,
        { status: 500 }
      );
    }

    console.log(`✅ Company ${params.id} approuvée par ${userEmail}`);

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

        const emailData = EmailService.generateCompanyApprovalEmail(
          company.name,
          company.billing_email,
          `${creator.first_name} ${creator.last_name}`
        );

        await EmailService.sendEmail(emailData);

        console.log(
          `📧 Email de notification envoyé à ${company.billing_email}`
        );
      }
    } catch (emailError) {
      console.warn("⚠️ Erreur envoi email (non bloquant):", emailError);
      // L'erreur d'email ne doit pas faire échouer l'approbation
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
    console.error("💥 Erreur admin approve company:", error);
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
