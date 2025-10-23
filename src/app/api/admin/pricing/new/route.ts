import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/supabase/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.name ||
      typeof body.name !== "string" ||
      !body.variables ||
      typeof body.variables !== "object" ||
      !Array.isArray(body.supplements)
    ) {
      return NextResponse.json(
        { success: false, error: "Payload invalide" },
        { status: 400 }
      );
    }

    // Auth admin via cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Session invalide" },
        { status: 401 }
      );
    }

    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS || "";
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    const email = session.user.email?.toLowerCase();
    if (!email || !allowed.includes(email)) {
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const { name, variables, supplements } = body;

    const { data, error } = await supabaseAdmin
      .from("pricing_sets")
      .insert({
        name,
        variables,
        supplements,
        is_active: false,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Erreur interne" },
      { status: 500 }
    );
  }
}
