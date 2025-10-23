import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * @param Middleware d'authentification pour protéger les routes
 *
 * Gère les redirections selon l'état d'authentification et d'onboarding
 */
export async function middleware(request: NextRequest) {
  // Créer une response mutable
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Mettre à jour les cookies dans la requête
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Mettre à jour les cookies dans la réponse
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Supprimer les cookies de la requête
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          // Supprimer les cookies de la réponse
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Laisser Supabase gérer les magic links (/auth/v1/verify) afin que la session
  // soit correctement créée et que les tokens (#access_token) soient injectés.

  // Si on est sur la page callback avec un token d'invitation
  if (pathname === "/auth/callback") {
    const inviteToken = request.nextUrl.searchParams.get("token");
    if (inviteToken) {
      console.log("🎯 Middleware: /auth/callback avec token, laissons passer");
      return response;
    }
  }

  // Routes API et assets (pas de protection)
  const isApiRoute = pathname.startsWith("/api/");
  const isAsset = pathname.includes(".");

  if (isApiRoute || isAsset) {
    return response;
  }

  // Routes publiques (pas de protection nécessaire)
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/auth/pending",
    "/auth/rejected",
    "/onboarding/",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith("/register/") ||
      pathname.startsWith("/invite/") ||
      pathname.startsWith("/auth/")
  );

  // Récupérer la session pour toutes les routes protégées
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "❌ Middleware: Erreur lors de la récupération de session",
      sessionError
    );

    // En cas d'erreur de session, rediriger vers login pour éviter les états incohérents
    if (!isPublicRoute) {
      console.log("🔒 Middleware: Erreur session, redirection vers login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Routes admin - protection renforcée
  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) {
    // Vérifier l'authentification d'abord
    if (!session) {
      console.log(
        "🔒 Middleware: Admin route - non connecté, redirection vers login"
      );
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérifier les privilèges admin
    const adminEmails = process.env.SPONTIS_ADMIN_EMAILS;
    if (!adminEmails) {
      console.error("❌ Middleware: SPONTIS_ADMIN_EMAILS non configuré");
      return NextResponse.json(
        { error: "Configuration admin manquante" },
        { status: 500 }
      );
    }

    const allowedEmails = adminEmails
      .split(",")
      .map((email) => email.trim().toLowerCase());
    const userEmail = session.user?.email?.toLowerCase();

    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`🚫 Middleware: Accès admin refusé pour ${userEmail}`);
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    console.log(`✅ Middleware: Accès admin autorisé pour ${userEmail}`);
    return response;
  }

  // Log pour debug
  const hasCookies = request.headers.get("cookie") || "";
  const hasSupabaseCookie = hasCookies.includes("sb-");
  console.log(
    `🔍 Middleware: Path=${pathname}, Session=${!!session}, HasCookies=${!!hasCookies}, HasSupabaseCookie=${hasSupabaseCookie}`
  );

  // Si non connecté et tentative d'accès à une route protégée
  if (!session && !isPublicRoute) {
    console.log("🔒 Middleware: Non connecté, redirection vers login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si connecté et sur une page d'auth (login/register)
  // DÉSACTIVÉ temporairement - laissons le client gérer ces redirections
  // pour éviter les conflits de synchronisation des cookies
  /*
  if (session && (pathname === "/login" || pathname.startsWith("/register"))) {
    console.log("🔄 Middleware: Déjà connecté, redirection vers espace expéditeur");
    const expediteurUrl = new URL("/expediteur", request.url);
    return NextResponse.redirect(expediteurUrl);
  }
  */

  // Fin de la logique serveur : si l’utilisateur est connecté, on laisse passer.
  if (session) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, sitemap.xml, robots.txt
     * - images et autres assets (.svg, .png, .jpg, etc.)
     * - api/auth/* pour éviter les conflits avec Supabase Auth
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|xml|woff|woff2|ttf|otf|eot|txt|pdf|zip|webmanifest)).*)",
  ],
};
