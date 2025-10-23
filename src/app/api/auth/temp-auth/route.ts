import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../supabase/supabase-admin";

/**
 * @param API Route pour l'authentification temporaire pendant l'onboarding
 *
 * Crée une session temporaire pour permettre l'accès à l'onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const { tempToken } = await request.json();

    console.log("=== DÉBUT API TEMP AUTH ===");
    console.log("Temp Token:", tempToken);

    if (!tempToken) {
      console.log("❌ Validation échouée: tempToken manquant");
      return NextResponse.json(
        { error: "Token temporaire requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("uid", tempToken)
      .single();

    if (userError || !userData) {
      console.error("❌ Utilisateur non trouvé:", userError);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si l'onboarding est réellement complété en regardant les données de la company
    if (userData.company_id) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("name, billing_address")
        .eq("id", userData.company_id)
        .single();

      if (companyError) {
        console.error("❌ Erreur récupération company:", companyError);
        return NextResponse.json(
          { error: "Erreur lors de la vérification de la company" },
          { status: 500 }
        );
      }

      // L'onboarding est complété si la company a un nom ET une adresse
      if (company?.name && company?.billing_address) {
        console.log("❌ Onboarding déjà complété - données company complètes");
        return NextResponse.json(
          { error: "L'onboarding est déjà complété" },
          { status: 400 }
        );
      }

      console.log(
        "✅ Company existe mais onboarding incomplet, autorisation accordée"
      );
    } else {
      console.log("✅ Pas de company_id, onboarding requis");
    }

    // Créer une session temporaire
    console.log("🔐 Création de session temporaire...");
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding/${userData.role}`,
        },
      });

    if (sessionError) {
      console.error("❌ Erreur création session:", sessionError);
      return NextResponse.json(
        { error: "Erreur lors de la création de la session temporaire" },
        { status: 500 }
      );
    }

    console.log("=== SUCCÈS API TEMP AUTH ===");
    return NextResponse.json({
      message: "Session temporaire créée avec succès",
      user: userData,
      sessionUrl: sessionData.properties.action_link,
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API temp auth:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
