import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { CompanyModerationData } from "@/types/admin";

interface CompaniesListResponse {
  success: boolean;
  error?: string;
  data?: {
    companies: CompanyModerationData[];
    total: number;
    stats: {
      pending: number;
      approved: number;
      rejected: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 API admin/companies - Liste des entreprises");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, approved, rejected, all
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

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
      console.log("❌ Admin companies list: Session invalide");
      return NextResponse.json(
        { success: false, error: "Session invalide" } as CompaniesListResponse,
        { status: 401 }
      );
    }

    // Vérifier les privilèges admin
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS;
    if (!adminEmails) {
      console.error("❌ SPONTIS_ADMIN_EMAILS non configuré");
      return NextResponse.json(
        { success: false, error: "Configuration admin manquante" } as CompaniesListResponse,
        { status: 500 }
      );
    }

    const allowedEmails = adminEmails.split(',').map(email => email.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();

    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`🚫 Admin companies list: Accès refusé pour ${userEmail}`);
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" } as CompaniesListResponse,
        { status: 403 }
      );
    }

    // Construire la requête avec filtres
    let query = supabaseAdmin
      .from("companies")
      .select(`
        id,
        name,
        legal_name,
        type,
        billing_email,
        status,
        vat_number,
        rcs,
        rejection_reason,
        created_at,
        updated_at,
        created_by
      `, { count: 'exact' });

    // Filtrer par status si spécifié
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Appliquer la pagination et le tri
    const { data: companies, error: companiesError, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (companiesError) {
      console.error("❌ Erreur récupération companies:", companiesError);
      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération des entreprises" } as CompaniesListResponse,
        { status: 500 }
      );
    }

    /**
     * @param Enrichissement des données avec les infos créateur
     *
     * Récupère les données des utilisateurs qui ont créé les entreprises
     */
    const enrichedCompanies: CompanyModerationData[] = [];

    if (companies && companies.length > 0) {
      // Récupérer tous les created_by uniques
      const creatorIds = [...new Set(companies.map(c => c.created_by))];
      
      // Récupérer les infos des créateurs
      const { data: creators } = await supabaseAdmin
        .from("users")
        .select("uid, first_name, last_name, email")
        .in("uid", creatorIds);

      // Créer un map pour faciliter la recherche
      const creatorsMap = new Map(
        creators?.map(creator => [creator.uid, creator]) || []
      );

      // Enrichir chaque entreprise
      for (const company of companies) {
        const creator = creatorsMap.get(company.created_by);
        
        enrichedCompanies.push({
          id: company.id,
          name: company.name,
          legal_name: company.legal_name,
          type: company.type,
          billing_email: company.billing_email,
          status: company.status,
          vat_number: company.vat_number,
          rcs: company.rcs,
          rejection_reason: company.rejection_reason,
          created_at: company.created_at,
          updated_at: company.updated_at,
          created_by: company.created_by,
          creator: creator ? {
            id: creator.uid,
            first_name: creator.first_name,
            last_name: creator.last_name,
            email: creator.email,
          } : undefined,
        });
      }
    }

    // Récupérer les statistiques
    const { data: statsData } = await supabaseAdmin
      .from("companies")
      .select("status");

    const stats = {
      pending: statsData?.filter(c => c.status === "pending").length || 0,
      approved: statsData?.filter(c => c.status === "approved").length || 0,
      rejected: statsData?.filter(c => c.status === "rejected").length || 0,
    };

    console.log(`✅ ${enrichedCompanies.length} entreprises récupérées (${status || 'all'})`);

    return NextResponse.json({
      success: true,
      data: {
        companies: enrichedCompanies,
        total: count || 0,
        stats,
      },
    } as CompaniesListResponse);

  } catch (error) {
    console.error("💥 Erreur admin companies list:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      } as CompaniesListResponse,
      { status: 500 }
    );
  }
}
