import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

interface DashboardStatsResponse {
  success: boolean;
  stats?: {
    mandats: number;
  };
  error?: string;
}

/**
 * @param Récupération des statistiques personnelles du dashboard
 *
 * Vérifie l'authentification de l'appelant puis renvoie le nombre de
 * mandats créés par l'utilisateur connecté uniquement.
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Début de la récupération des stats dashboard");

    // 1) Validation de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json<DashboardStatsResponse>(
        { success: false, error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("🔑 Token récupéré, validation en cours...");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Erreur d'authentification:", authError);
      return NextResponse.json<DashboardStatsResponse>(
        { success: false, error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    console.log("✅ Utilisateur authentifié:", user.id);

    // 2) Récupération du nombre de mandats de l'utilisateur connecté
    /**
     * @param Comptage des mandats créés par l'utilisateur
     *
     * Utilise supabaseAdmin pour contourner les politiques RLS et filtre sur l'uid utilisateur.
     */
    console.log("📊 Comptage des mandats pour l'utilisateur:", user.id);
    const { count: mandatsCount, error: mandatsError } = await supabaseAdmin
      .from("mandats")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id);

    if (mandatsError) {
      console.error(
        "❌ Erreur Supabase lors du comptage des mandats:",
        mandatsError
      );
      throw mandatsError;
    }

    console.log("✅ Nombre de mandats trouvés:", mandatsCount);

    return NextResponse.json<DashboardStatsResponse>({
      success: true,
      stats: {
        mandats: mandatsCount ?? 0,
      },
    });
  } catch (error) {
    console.error("💥 Erreur lors de la récupération des stats:", error);

    // Retourner une erreur plus détaillée en développement
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json<DashboardStatsResponse>(
      {
        success: false,
        error: isDev
          ? `Erreur détaillée: ${
              error instanceof Error ? error.message : String(error)
            }`
          : "Erreur serveur lors de la récupération des stats",
      },
      { status: 500 }
    );
  }
}
