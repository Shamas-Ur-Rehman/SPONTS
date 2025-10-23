import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../supabase/supabase-admin";

/**
 * @param API Route pour sauvegarder les données d'onboarding
 *
 * Sauvegarde les données de profil et finalise l'inscription
 */
export async function POST(request: NextRequest) {
  try {
    const { tempToken, profileData } = await request.json();

    console.log("=== DÉBUT API SAVE ONBOARDING ===");
    console.log("Temp Token:", tempToken);

    if (!tempToken || !profileData) {
      console.log("❌ Validation échouée: tempToken ou profileData manquant");
      return NextResponse.json(
        { error: "Token temporaire et données de profil requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe et n'est pas déjà confirmé
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

    // Vérifier que l'utilisateur n'est pas déjà confirmé
    const { error: authError } = await supabaseAdmin.auth.admin.getUserById(
      tempToken
    );

    if (authError) {
      console.error("❌ Erreur récupération utilisateur Auth:", authError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'utilisateur" },
        { status: 500 }
      );
    }

    // Vérifier si l'utilisateur a déjà une company avec des données complètes
    const { data: existingMembership } = await supabaseAdmin
      .from("company_members")
      .select("company_id, company:companies(*)")
      .eq("user_id", tempToken)
      .maybeSingle();

    if (existingMembership?.company_id) {
      const company = (existingMembership as any)?.company;
      // Vérifier si la company a déjà des données complètes (nom + adresse)
      if (company?.name && company?.billing_address) {
        console.log(
          "❌ Onboarding déjà complété - company avec données complètes"
        );
        return NextResponse.json(
          { error: "L'onboarding est déjà complété" },
          { status: 400 }
        );
      } else {
        console.log(
          "💾 Company existante trouvée mais incomplète, mise à jour..."
        );
      }
    }

    let company;
    let companyError;

    if (existingMembership?.company_id) {
      // Mettre à jour la company existante
      console.log("💾 Mise à jour de la company existante...");
      const updateResult = await supabaseAdmin
        .from("companies")
        .update({
          name: profileData.raisonSociale ?? null,
          legal_name: profileData.raisonSociale ?? null,
          type: userData.role,
          vat_number: profileData.numeroTVA ?? null,
          rcs: profileData.numeroRCS ?? null,
          billing_email: profileData.emailContact ?? userData.email,
          billing_address: profileData.adresse ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMembership.company_id)
        .select()
        .single();

      company = updateResult.data;
      companyError = updateResult.error;
    } else {
      // Créer une nouvelle company
      console.log("💾 Création de la company depuis l'onboarding...");
      const insertResult = await supabaseAdmin
        .from("companies")
        .insert({
          name: profileData.raisonSociale ?? null,
          legal_name: profileData.raisonSociale ?? null,
          type: userData.role,
          vat_number: profileData.numeroTVA ?? null,
          rcs: profileData.numeroRCS ?? null,
          billing_email: profileData.emailContact ?? userData.email,
          billing_address: profileData.adresse ?? null,
          status: "pending",
          created_by: tempToken,
        })
        .select()
        .single();

      company = insertResult.data;
      companyError = insertResult.error;
    }

    if (companyError) {
      console.error(
        "❌ Erreur création company depuis onboarding:",
        companyError
      );
      return NextResponse.json(
        { error: "Erreur lors de la création de la société" },
        { status: 500 }
      );
    }

    // Récupérer ou créer le membership owner
    let membershipId: string;

    if (!existingMembership?.company_id) {
      console.log("💾 Création du membership owner...");
      const { data: newMembership, error: memberError } = await supabaseAdmin
        .from("company_members")
        .insert({
          company_id: company.id,
          user_id: tempToken,
          role: "owner",
          invited_by: tempToken,
        })
        .select("id")
        .single();

      if (memberError || !newMembership) {
        console.error("❌ Erreur création membership owner:", memberError);
        // Rollback minimal: supprimer la company créée pour éviter des orphelins
        await supabaseAdmin.from("companies").delete().eq("id", company.id);
        return NextResponse.json(
          { error: "Erreur lors de la création du membership" },
          { status: 500 }
        );
      }

      membershipId = newMembership.id;
      console.log("✅ Membership owner créé:", membershipId);
    } else {
      console.log("✅ Membership owner existe déjà, récupération de l'ID...");
      // Récupérer l'ID du membership existant
      const { data: existingMembershipData } = await supabaseAdmin
        .from("company_members")
        .select("id")
        .eq("user_id", tempToken)
        .eq("company_id", existingMembership.company_id)
        .single();

      membershipId = existingMembershipData?.id;

      if (!membershipId) {
        console.error("❌ Impossible de récupérer l'ID du membership existant");
        return NextResponse.json(
          { error: "Erreur lors de la récupération du membership" },
          { status: 500 }
        );
      }
    }

    // Synchroniser company_id ET company_members dans public.users
    console.log(
      "🔗 Mise à jour company_id + company_members dans public.users..."
    );
    const { error: updateUserError } = await supabaseAdmin
      .from("users")
      .update({
        company_id: company.id,
        company_members: membershipId,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", tempToken);

    if (updateUserError) {
      console.error(
        "❌ Erreur mise à jour company_id + company_members dans users:",
        updateUserError
      );
      // Ne pas faire échouer l'onboarding pour cette erreur, mais logger
    } else {
      console.log("✅ Company_id + company_members synchronisés dans users:", {
        company_id: company.id,
        company_members: membershipId,
      });
    }

    console.log("=== SUCCÈS API SAVE ONBOARDING ===");
    return NextResponse.json({
      message: "Profil sauvegardé avec succès !",
      user: userData,
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API save onboarding:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
