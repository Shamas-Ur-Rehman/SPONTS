import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { MandatModerationData } from "@/types/admin";

interface MandatsListResponse {
  success: boolean;
  error?: string;
  data?: {
    mandats: MandatModerationData[];
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
    console.log("🚀 API admin/mandats - Liste des mandats");

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
      console.log("❌ Admin mandats list: Session invalide");
      return NextResponse.json(
        { success: false, error: "Session invalide" } as MandatsListResponse,
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
        } as MandatsListResponse,
        { status: 500 }
      );
    }

    const allowedEmails = adminEmails
      .split(",")
      .map((email) => email.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();

    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`🚫 Admin mandats list: Accès refusé pour ${userEmail}`);
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" } as MandatsListResponse,
        { status: 403 }
      );
    }

    // Construire la requête avec filtres - sélectionner tous les champs
    let query = supabaseAdmin.from("mandats").select(`*`, { count: "exact" });

    // Filtrer par status si spécifié
    // Note: Si status est null en DB, on le considère comme "pending"
    if (status && status !== "all") {
      if (status === "pending") {
        // Inclure les mandats avec status null ou "pending"
        query = query.or("status.is.null,status.eq.pending");
      } else {
        query = query.eq("status", status);
      }
    }

    // Appliquer la pagination et le tri
    const {
      data: mandats,
      error: mandatsError,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (mandatsError) {
      console.error("❌ Erreur récupération mandats:", mandatsError);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la récupération des mandats",
        } as MandatsListResponse,
        { status: 500 }
      );
    }

    /**
     * @param Enrichissement des données avec les infos créateur et entreprise
     *
     * Récupère les données des utilisateurs et entreprises liés aux mandats
     */
    const enrichedMandats: MandatModerationData[] = [];

    if (mandats && mandats.length > 0) {
      // Récupérer tous les created_by et company_id uniques
      const creatorIds = [...new Set(mandats.map((m) => m.created_by))];
      const companyIds = [...new Set(mandats.map((m) => m.company_id))];

      // Récupérer les infos des créateurs
      const { data: creators } = await supabaseAdmin
        .from("users")
        .select("uid, first_name, last_name, email")
        .in("uid", creatorIds);

      // Récupérer les infos des entreprises
      const { data: companies } = await supabaseAdmin
        .from("companies")
        .select("id, name, type")
        .in("id", companyIds);

      // Créer des maps pour faciliter la recherche
      const creatorsMap = new Map(
        creators?.map((creator) => [creator.uid, creator]) || []
      );
      const companiesMap = new Map(
        companies?.map((company) => [company.id, company]) || []
      );

      // Enrichir chaque mandat
      for (const mandat of mandats) {
        const creator = creatorsMap.get(mandat.created_by);
        const company = companiesMap.get(mandat.company_id);

        enrichedMandats.push({
          // Copier TOUS les champs du mandat
          ...mandat,
          // Assurer que status a une valeur par défaut
          status: mandat.status || "pending",
          // Ajouter les relations enrichies
          creator: creator
            ? {
                id: creator.uid,
                first_name: creator.first_name,
                last_name: creator.last_name,
                email: creator.email,
              }
            : undefined,
          company: company
            ? {
                id: company.id,
                name: company.name,
                type: company.type,
              }
            : undefined,
        });
      }
    }

    // Récupérer les statistiques
    const { data: statsData } = await supabaseAdmin
      .from("mandats")
      .select("status");

    const stats = {
      pending:
        statsData?.filter((m) => !m.status || m.status === "pending").length ||
        0,
      approved: statsData?.filter((m) => m.status === "approved").length || 0,
      rejected: statsData?.filter((m) => m.status === "rejected").length || 0,
    };

    console.log(
      `✅ ${enrichedMandats.length} mandats récupérés (${status || "all"})`
    );

    return NextResponse.json({
      success: true,
      data: {
        mandats: enrichedMandats,
        total: count || 0,
        stats,
      },
    } as MandatsListResponse);
  } catch (error) {
    console.error("💥 Erreur admin mandats list:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      } as MandatsListResponse,
      { status: 500 }
    );
  }
}
