import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import console from "console";

/**
 * @param API Route pour gérer l'inscription utilisateur
 *
 * Crée les enregistrements dans les tables users et user_metadata
 * après l'inscription réussie dans Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, first_name, last_name, role } =
      await request.json();

    console.log("=== DÉBUT API SIGNUP ===");
    console.log("Données reçues:", { email, first_name, last_name, role });

    // Validation des données requises
    if (!email || !password || !first_name || !last_name || !role) {
      console.log("❌ Validation échouée: champs manquants");
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    console.log("✅ Validation réussie");

    // Inscription avec Supabase Auth (client normal)
    console.log("🔐 Tentative d'inscription Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          first_name,
          last_name,
          role,
        },
      },
    });

    if (authError) {
      console.error("❌ Erreur Auth:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      console.error("❌ Pas d'utilisateur créé");
      return NextResponse.json(
        { error: "Erreur lors de la création de l'utilisateur" },
        { status: 500 }
      );
    }

    console.log("✅ Utilisateur Auth créé:", authData.user.id);

    // Créer l'enregistrement dans la table users
    console.log("📝 Tentative d'insertion dans public.users...");
    const userInsertData = {
      uid: authData.user.id,
      email: email.toLowerCase().trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Données à insérer:", userInsertData);

    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert(userInsertData)
      .select()
      .single();

    if (userError) {
      console.error("❌ Erreur insertion users:", userError);
      console.error("Détails erreur:", {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
      });

      return NextResponse.json(
        {
          error: "Erreur lors de la création du profil utilisateur",
          details: userError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Utilisateur inséré dans public.users:", userData);

    // Plus de création dans user_metadata: l'onboarding est désormais porté par companies

    // Créer une company et ownership membership
    console.log("🏢 Création de la company par défaut...");
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: `${first_name.trim()} ${last_name.trim()}`.trim(),
        legal_name: null,
        type: role,
        billing_email: email.toLowerCase().trim(),
        status: "pending",
        created_by: authData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (companyError) {
      console.error("❌ Erreur création company:", companyError);
      return NextResponse.json(
        {
          error: "Erreur lors de la création de l'entreprise",
          details: companyError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Company créée:", company?.id);

    // Créer le membership owner
    console.log("👤 Création du company_member owner...");
    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: authData.user.id,
        role: "owner",
        invited_by: null, // L'owner n'est pas invité
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (membershipError) {
      console.error("❌ Erreur création membership:", membershipError);
      return NextResponse.json(
        {
          error: "Erreur lors de la création du membership",
          details: membershipError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Company member créé:", membership?.id);

    // Mettre à jour company_id ET company_members dans public.users
    console.log(
      "🔗 Mise à jour company_id + company_members dans public.users..."
    );
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        company_id: company.id,
        company_members: membership.id, // Nouvelle foreign key directe
        updated_at: new Date().toISOString(),
      })
      .eq("uid", authData.user.id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "❌ Erreur mise à jour company_id + company_members:",
        updateError
      );
      return NextResponse.json(
        {
          error: "Erreur lors de la mise à jour des données utilisateur",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Company_id + company_members mis à jour dans users:", {
      company_id: updatedUser?.company_id,
      company_members: updatedUser?.company_members,
    });

    console.log("=== SUCCÈS API SIGNUP ===");
    return NextResponse.json({
      message: "Compte créé avec succès !",
      user: userData,
      session: authData.session,
      needsOnboarding: true,
      needsEmailVerification: false,
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API signup:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
