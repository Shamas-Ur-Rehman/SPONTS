import { NextRequest, NextResponse } from "next/server";
import { SupabaseStorageService } from "@/supabase/supabase-storage";
import { supabase } from "@/supabase/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Début de l'upload d'image");

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

    // Vérification du rôle utilisateur (seuls les expéditeurs peuvent créer des mandats)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("uid", user.id)
      .single();

    if (userError || !userData) {
      console.log("❌ Utilisateur non trouvé:", userError);
      return NextResponse.json(
        { error: "Profil utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (userData.role !== "expediteur") {
      console.log("❌ Rôle incorrect:", userData.role);
      return NextResponse.json(
        {
          error:
            "Accès refusé. Seuls les expéditeurs peuvent créer des mandats.",
        },
        { status: 403 }
      );
    }

    console.log("✅ Rôle vérifié: expéditeur");

    // Récupération des données du formulaire
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mandatId = formData.get("mandatId") as string | null;

    if (!file) {
      console.log("❌ Aucun fichier fourni");
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    console.log("✅ Fichier reçu:", file.name, file.size, "bytes");

    // Upload de l'image
    console.log("🔄 Début de l'upload vers Supabase Storage");
    const uploadResult = await SupabaseStorageService.uploadImage({
      file,
      userId: user.id,
      mandatId: mandatId || undefined,
    });

    if (!uploadResult.success) {
      console.log("❌ Erreur upload:", uploadResult.error);
      return NextResponse.json({ error: uploadResult.error }, { status: 400 });
    }

    console.log("✅ Upload réussi:", uploadResult.url);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path,
    });
  } catch (error) {
    console.error("💥 Erreur upload image:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    // Récupération du chemin du fichier à supprimer
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "Chemin du fichier manquant" },
        { status: 400 }
      );
    }

    // Vérification que l'utilisateur peut supprimer ce fichier
    if (!filePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Suppression de l'image
    const deleteResult = await SupabaseStorageService.deleteImage(filePath);

    if (!deleteResult.success) {
      return NextResponse.json({ error: deleteResult.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression image:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
