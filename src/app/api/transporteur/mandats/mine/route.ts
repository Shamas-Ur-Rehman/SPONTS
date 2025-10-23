import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../supabase/supabase-admin";
import { supabase } from "../../../../../../supabase/supabase";

/**
 * @param API Route pour récupérer les mandats assignés au transporteur
 *
 * Retourne les mandats assignés à l'entreprise transporteur de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    console.log("=== DÉBUT API MES MANDATS TRANSPORTEUR ===");

    // Récupérer les paramètres de pagination
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Validation des paramètres
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "La limite doit être entre 1 et 50" },
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("❌ Erreur authentification:", authError);
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    console.log("Utilisateur authentifié:", user.id);

    // Récupérer l'entreprise transporteur de l'utilisateur
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.error("❌ Utilisateur non membre d'entreprise:", membershipError);
      return NextResponse.json(
        { error: "Vous devez être membre d'une entreprise transporteur" },
        { status: 403 }
      );
    }

    console.log("Entreprise transporteur:", membership.company_id);

    // Construire la requête avec pagination
    let query = supabaseAdmin
      .from("mandats")
      .select(`
        *,
        company:companies!mandats_company_id_fkey(name, legal_name)
      `)
      .eq("transporteur_company_id", membership.company_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Ajouter le curseur si fourni
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: mandats, error } = await query;

    if (error) {
      console.error("❌ Erreur récupération mes mandats:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des mandats" },
        { status: 500 }
      );
    }

    console.log(`✅ ${mandats?.length || 0} mandats récupérés pour le transporteur`);

    // Préparer la réponse avec pagination
    const response = {
      mandats: mandats || [],
      pagination: {
        hasMore: mandats && mandats.length === limit,
        nextCursor: mandats && mandats.length > 0 ? mandats[mandats.length - 1].created_at : null,
      },
    };

    console.log("=== SUCCÈS API MES MANDATS TRANSPORTEUR ===");
    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Erreur générale dans l'API mes mandats:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
