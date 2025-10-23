import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { ok: false, error: "Tokens manquants" },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Forcer la récupération pour s'assurer que les cookies sont bien écrits
    await supabase.auth.getSession();

    return response;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Erreur interne" },
      { status: 500 }
    );
  }
}
