import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../supabase/supabase-admin";
import { supabase } from "../../../../../../supabase/supabase";

/**
 * @param API Route pour récupérer les mandats disponibles dans le marketplace
 *
 * Retourne les mandats approuvés qui ne sont pas encore assignés à un transporteur
 */
export async function GET(request: NextRequest) {
  try {
    console.log("=== DÉBUT API MARKETPLACE TRANSPORTEUR ===");

    // Vérification de l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("✅ Token récupéré");

    // Vérification du token avec Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Token invalide:", authError);
      return NextResponse.json(
        { error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    console.log("✅ Utilisateur authentifié:", user.id);

    // Vérifier que l'utilisateur est membre d'une entreprise transporteur
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select(`
        company_id,
        companies!inner(
          id,
          type,
          status
        )
      `)
      .eq("user_id", user.id)
      .eq("companies.type", "transporteur")
      .eq("companies.status", "approved")
      .single();

    if (membershipError || !membership) {
      console.log("❌ Utilisateur non transporteur ou entreprise non approuvée");
      return NextResponse.json(
        { error: "Accès non autorisé - transporteur requis" },
        { status: 403 }
      );
    }

    console.log("✅ Transporteur vérifié:", membership.company_id);

    // Récupérer les paramètres de pagination et de tri
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortOrder = searchParams.get("sort") || "desc"; // "desc" par défaut (plus récent en premier)

    // Validation des paramètres
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "La limite doit être entre 1 et 50" },
        { status: 400 }
      );
    }

    // Validation du paramètre de tri
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      return NextResponse.json(
        { error: "Le paramètre de tri doit être 'asc' ou 'desc'" },
        { status: 400 }
      );
    }

    // Construire la requête avec pagination et tri
    let query = supabaseAdmin
      .from("mandats")
      .select(`
        *,
        company:companies!mandats_company_id_fkey(name, legal_name)
      `)
      .eq("status", "approved")
      .is("transporteur_company_id", null)
      .order("created_at", { ascending: sortOrder === "asc" })
      .limit(limit);

    // Ajouter le curseur si fourni (adaptation selon l'ordre de tri)
    if (cursor) {
      if (sortOrder === "desc") {
        // Tri décroissant : curseur pour "plus ancien que"
        query = query.lt("created_at", cursor);
      } else {
        // Tri croissant : curseur pour "plus récent que"
        query = query.gt("created_at", cursor);
      }
    }

    const { data: mandats, error } = await query;

    if (error) {
      console.error("❌ Erreur récupération marketplace:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des mandats" },
        { status: 500 }
      );
    }

    console.log(`✅ ${mandats?.length || 0} mandats récupérés du marketplace`);

    // Préparer la réponse avec pagination
    const response = {
      mandats: mandats || [],
      pagination: {
        hasMore: mandats && mandats.length === limit,
        nextCursor: mandats && mandats.length > 0 ? mandats[mandats.length - 1].created_at : null,
        sortOrder: sortOrder, // Inclure l'ordre de tri dans la réponse
      },
    };

    console.log("=== SUCCÈS API MARKETPLACE TRANSPORTEUR ===");
    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Erreur générale dans l'API marketplace:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
