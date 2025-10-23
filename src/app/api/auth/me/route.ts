import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token d'authentification manquant" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token d'authentification invalide" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("uid", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la récupération du profil" }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}


