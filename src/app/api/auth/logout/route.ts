import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";

/**
 * @param API Route pour la déconnexion utilisateur
 *
 * Déconnexion rapide et efficace avec logs minimaux
 */
export async function POST(request: NextRequest) {
  try {
    console.log("=== DÉBUT API LOGOUT ===");
    console.log("🕐 Timestamp:", new Date().toISOString());

    // Récupérer le token d'autorisation depuis les headers
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'autorisation manquant");
      return NextResponse.json(
        { error: "Token d'autorisation requis" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log("✅ Token extrait, déconnexion en cours...");

    // Déconnexion rapide via l'API admin
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
      token
    );

    if (signOutError) {
      console.error("❌ Erreur lors de la déconnexion:", signOutError);
      return NextResponse.json(
        { error: "Erreur lors de la déconnexion" },
        { status: 500 }
      );
    }

    console.log("✅ Déconnexion réussie");
    console.log("=== SUCCÈS API LOGOUT ===");

    return NextResponse.json({
      success: true,
      message: "Déconnexion réussie",
      logoutTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 Erreur générale dans l'API logout:", error);

    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la déconnexion" },
      { status: 500 }
    );
  }
}
