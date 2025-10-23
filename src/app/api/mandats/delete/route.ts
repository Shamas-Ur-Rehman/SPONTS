import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

interface DeleteMandatResponse {
  success: boolean;
  error?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API delete mandat - Début");

    // 1) Validation de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("🔑 Token récupéré");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log("❌ Erreur d'authentification:", authError);
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }
    console.log("✅ Utilisateur authentifié:", user.id);

    // 2) Vérification du rôle utilisateur
    console.log("🔄 Vérification du rôle utilisateur...");
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("uid", user.id)
      .single();

    if (userError || !userData) {
      console.log("❌ Erreur lors de la récupération du rôle:", userError);
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Erreur lors de la vérification du rôle" },
        { status: 500 }
      );
    }

    console.log("✅ Rôle utilisateur:", userData.role);

    if (userData.role !== "expediteur") {
      console.log("❌ Rôle insuffisant:", userData.role);
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Accès refusé: rôle insuffisant" },
        { status: 403 }
      );
    }

    console.log("✅ Rôle vérifié: expéditeur");

    // 3) Récupération de l'ID du mandat depuis l'URL
    const url = new URL(request.url);
    const mandatId = url.searchParams.get("id");

    if (!mandatId) {
      console.log("❌ ID du mandat manquant");
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "ID du mandat manquant" },
        { status: 400 }
      );
    }

    console.log("🔄 Suppression du mandat ID:", mandatId);

    // 4) Vérification que le mandat appartient à l'utilisateur
    const { data: mandat, error: mandatError } = await supabaseAdmin
      .from("mandats")
      .select("id, created_by")
      .eq("id", mandatId)
      .eq("created_by", user.id)
      .single();

    if (mandatError || !mandat) {
      console.log(
        "❌ Mandat non trouvé ou n'appartient pas à l'utilisateur:",
        mandatError
      );
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Mandat non trouvé ou accès refusé" },
        { status: 404 }
      );
    }

    console.log("✅ Mandat trouvé et appartenant à l'utilisateur");

    // 5) Suppression du mandat
    const { error: deleteError } = await supabaseAdmin
      .from("mandats")
      .delete()
      .eq("id", mandatId)
      .eq("created_by", user.id);

    if (deleteError) {
      console.error("❌ Erreur lors de la suppression:", deleteError);
      return NextResponse.json<DeleteMandatResponse>(
        { success: false, error: "Erreur lors de la suppression du mandat" },
        { status: 500 }
      );
    }

    console.log("✅ Mandat supprimé avec succès");
    return NextResponse.json<DeleteMandatResponse>({ success: true });
  } catch (error) {
    console.error("💥 Erreur lors de la suppression du mandat:", error);
    return NextResponse.json<DeleteMandatResponse>(
      {
        success: false,
        error: "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
