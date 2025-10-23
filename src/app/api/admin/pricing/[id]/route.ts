import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/supabase/supabase-admin";

interface PricingDetailResponse {
  success: boolean;
  error?: string;
  data?: {
    pricing: any;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
        { success: false, error: "Session invalide" } as PricingDetailResponse,
        { status: 401 }
      );
    }

    // Vérif admin
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS || "";
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    const email = session.user.email?.toLowerCase();
    if (!email || !allowed.includes(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès non autorisé",
        } as PricingDetailResponse,
        { status: 403 }
      );
    }

    const { data: pricing, error } = await supabaseAdmin
      .from("pricing_sets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message } as PricingDetailResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { pricing },
    } as PricingDetailResponse);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne: ${
          err instanceof Error ? err.message : "Erreur"
        }`,
      } as PricingDetailResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Auth via cookies
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

    // Vérif admin
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS || "";
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    const email = session.user.email?.toLowerCase();
    if (!email || !allowed.includes(email)) {
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("pricing_sets")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Erreur interne" },
      { status: 500 }
    );
  }
}

// PATCH pour définir ce pricing comme actif
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    if (!session?.user)
      return NextResponse.json(
        { success: false, error: "Session invalide" },
        { status: 401 }
      );

    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS || "";
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    const email = session.user.email?.toLowerCase();
    if (!email || !allowed.includes(email))
      return NextResponse.json(
        { success: false, error: "Accès non autorisé" },
        { status: 403 }
      );

    // Définir tous false puis celui-ci true (transaction simple)
    const { error: err1 } = await supabaseAdmin
      .from("pricing_sets")
      .update({ is_active: false })
      .neq("id", id);

    if (err1)
      return NextResponse.json(
        { success: false, error: err1.message },
        { status: 500 }
      );

    const { data, error } = await supabaseAdmin
      .from("pricing_sets")
      .update({ is_active: true, activated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Erreur interne" },
      { status: 500 }
    );
  }
}
