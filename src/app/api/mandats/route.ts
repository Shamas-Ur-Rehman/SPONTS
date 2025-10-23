import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { Mandat } from "@/types/mandat";

interface MandatsResponse {
  success: boolean;
  mandats?: Mandat[];
  userRole?: string; // Rôle de l'utilisateur dans l'entreprise
  error?: string;
}

/**
 * @param Récupération des mandats de l'utilisateur connecté
 *
 * Vérifie l'authentification de l'appelant puis renvoie tous les mandats
 * créés par l'utilisateur connecté, triés par date de création décroissante.
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Début de la récupération des mandats");

    // 1) Validation de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json<MandatsResponse>(
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
      return NextResponse.json<MandatsResponse>(
        { success: false, error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    console.log("✅ Utilisateur authentifié:", user.id);

    // 2) Récupération de l'entreprise de l'utilisateur
    console.log("🔍 Recherche de l'entreprise de l'utilisateur:", user.id);
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.log("❌ Utilisateur non membre d'une entreprise");
      return NextResponse.json<MandatsResponse>(
        { success: false, error: "Utilisateur non membre d'une entreprise" },
        { status: 404 }
      );
    }

    // 3) Récupération des mandats de l'entreprise
    /**
     * @param Récupération des mandats de l'entreprise
     *
     * Utilise supabaseAdmin pour contourner les politiques RLS et filtre sur l'entreprise.
     * Trie par date de création décroissante (plus récents en premier).
     * Pour les utilisateurs normaux, ne montre que les mandats approuvés.
     */
    console.log(
      "📊 Récupération des mandats pour l'entreprise:",
      membership.company_id
    );

    // Récupérer tous les mandats de l'entreprise (y compris pending et rejected)
    // Sélectionner toutes les colonnes pour supporter les nouveaux champs
    const mandatsQuery = supabaseAdmin
      .from("mandats")
      .select("*")
      .eq("company_id", membership.company_id);

    // Pour les utilisateurs normaux, montrer tous les mandats mais avec des badges de statut
    // Les admins et owners verront tous les mandats avec leur statut
    const { data: mandats, error: mandatsError } = await mandatsQuery.order(
      "created_at",
      { ascending: false }
    );

    if (mandatsError) {
      console.error(
        "❌ Erreur Supabase lors de la récupération des mandats:",
        mandatsError
      );
      throw mandatsError;
    }

    console.log("✅ Nombre de mandats trouvés:", mandats?.length || 0);

    // Charger les infos créateur séparément (à partir de created_by → users.uid)
    let enrichedMandats = mandats || [];
    if (enrichedMandats.length > 0) {
      const creatorIds = Array.from(
        new Set(
          enrichedMandats.map((m) => (m as any).created_by).filter(Boolean)
        )
      );
      if (creatorIds.length > 0) {
        const { data: creators, error: creatorsError } = await supabaseAdmin
          .from("users")
          .select("uid, first_name, last_name, email")
          .in("uid", creatorIds);

        if (!creatorsError && creators) {
          const uidToCreator: Record<
            string,
            { first_name: string; last_name: string; email: string }
          > = {};
          for (const c of creators) {
            uidToCreator[(c as any).uid] = {
              first_name: (c as any).first_name || "",
              last_name: (c as any).last_name || "",
              email: (c as any).email || "",
            };
          }
          enrichedMandats = enrichedMandats.map((m) => ({
            ...m,
            creator: uidToCreator[(m as any).created_by] || null,
          }));
        }
      }
    }

    return NextResponse.json<MandatsResponse>({
      success: true,
      mandats: enrichedMandats as any,
      userRole: membership.role, // Inclure le rôle pour les permissions frontend
    });
  } catch (error) {
    console.error("💥 Erreur lors de la récupération des mandats:", error);

    // Retourner une erreur plus détaillée en développement
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json<MandatsResponse>(
      {
        success: false,
        error: isDev
          ? `Erreur détaillée: ${
              error instanceof Error ? error.message : String(error)
            }`
          : "Erreur serveur lors de la récupération des mandats",
      },
      { status: 500 }
    );
  }
}
