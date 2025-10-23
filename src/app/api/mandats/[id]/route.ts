import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔍 Début de la récupération du mandat:", params.id);

    // 1) Validation de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json(
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
      return NextResponse.json(
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
      return NextResponse.json(
        { success: false, error: "Utilisateur non membre d'une entreprise" },
        { status: 404 }
      );
    }

    const mandatId = params.id;

    // 3) Récupération du mandat avec vérification des permissions
    console.log(
      "📊 Récupération du mandat:",
      mandatId,
      "pour l'entreprise:",
      membership.company_id
    );

    const { data: mandat, error: mandatError } = await supabaseAdmin
      .from("mandats")
      .select("*")
      .eq("id", mandatId)
      .eq("company_id", membership.company_id)
      .single();

    if (mandatError) {
      console.error(
        "❌ Erreur lors de la récupération du mandat:",
        mandatError
      );
      return NextResponse.json(
        { success: false, error: "Mandat introuvable" },
        { status: 404 }
      );
    }

    if (!mandat) {
      console.log("❌ Mandat introuvable");
      return NextResponse.json(
        { success: false, error: "Mandat introuvable" },
        { status: 404 }
      );
    }

    console.log("✅ Mandat trouvé:", mandat.id);

    // 4) Enrichissement avec les données du créateur si disponible
    let enrichedMandat = mandat;
    if (mandat.created_by) {
      const { data: creator, error: creatorError } = await supabaseAdmin
        .from("users")
        .select("uid, first_name, last_name, email")
        .eq("uid", mandat.created_by)
        .single();

      if (!creatorError && creator) {
        enrichedMandat = {
          ...mandat,
          creator: {
            first_name: creator.first_name || "",
            last_name: creator.last_name || "",
            email: creator.email || "",
          },
        };
      }
    }

    // 5) Enrichissement avec les données du transporteur si attribué
    if (mandat.transporteur_company_id) {
      const { data: transporteurCompany, error: transporteurError } =
        await supabaseAdmin
          .from("companies")
          .select("id, name, legal_name")
          .eq("id", mandat.transporteur_company_id)
          .single();

      if (!transporteurError && transporteurCompany) {
        enrichedMandat = {
          ...enrichedMandat,
          transporteur_company: transporteurCompany,
        };
      }
    }

    return NextResponse.json({
      success: true,
      mandat: enrichedMandat,
    });
  } catch (error) {
    console.error("💥 Erreur lors de la récupération du mandat:", error);

    // Retourner une erreur plus détaillée en développement
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        success: false,
        error: isDev
          ? `Erreur détaillée: ${
              error instanceof Error ? error.message : String(error)
            }`
          : "Erreur serveur lors de la récupération du mandat",
      },
      { status: 500 }
    );
  }
}
