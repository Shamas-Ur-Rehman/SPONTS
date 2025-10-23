import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/supabase/supabase-admin";

interface PricingListResponse {
  success: boolean;
  error?: string;
  data?: {
    pricings: {
      id: number;
      name: string;
      is_active: boolean;
      created_at: string;
    }[];
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 API admin/pricing - Liste des pricings");

    // Authentification via cookies
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
      console.log("❌ Admin pricing list: Session invalide");
      return NextResponse.json(
        { success: false, error: "Session invalide" } as PricingListResponse,
        { status: 401 }
      );
    }

    // Vérifier privilèges admin via env var SPONTIS_ADMIN_EMAILS
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS;
    if (!adminEmails) {
      console.error("❌ SPONTIS_ADMIN_EMAILS non configuré");
      return NextResponse.json(
        {
          success: false,
          error: "Configuration admin manquante",
        } as PricingListResponse,
        { status: 500 }
      );
    }

    const allowedEmails = adminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`🚫 Admin pricing list: Accès refusé pour ${userEmail}`);
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" } as PricingListResponse,
        { status: 403 }
      );
    }

    // Récupérer les pricings
    let query = supabaseAdmin
      .from("pricing_sets")
      .select("id, name, is_active, created_at, variables, supplements")
      .order("created_at", { ascending: false });

    const { searchParams } = new URL(request.url);
    if (
      searchParams.get("active") === "1" ||
      searchParams.get("active") === "true"
    ) {
      query = query.eq("is_active", true);
    }

    const { data: pricingSets, error } = await query;

    if (error) {
      console.error("❌ Erreur récupération pricing_sets:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la récupération des pricings",
        } as PricingListResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pricings: pricingSets || [],
      },
    } as PricingListResponse);
  } catch (err) {
    console.error("💥 Erreur admin pricing list:", err);
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne: ${
          err instanceof Error ? err.message : "Erreur inconnue"
        }`,
      } as PricingListResponse,
      { status: 500 }
    );
  }
}
