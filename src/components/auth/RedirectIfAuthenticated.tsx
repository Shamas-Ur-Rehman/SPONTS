"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function RedirectIfAuthenticated({
  children,
  redirectTo,
}: RedirectIfAuthenticatedProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (loading || (user && user.user_data === null)) return;

    // Si on arrive depuis une déconnexion, ne pas rediriger
    const isLogout = searchParams?.get("logout") === "success";
    if (isLogout) {
      return;
    }

    // Exception pour les pages d'invitation - permettre à l'utilisateur de rester même s'il est connecté
    const isInvitePage = pathname?.startsWith("/invite/");
    const hasInviteToken = searchParams?.get("token") !== null;
    const hasAccessToken =
      typeof window !== "undefined" &&
      window.location.hash.includes("access_token");
    const hasMagicLinkFlag =
      typeof window !== "undefined" &&
      localStorage.getItem("magic_link_invitation") === "true";

    // Exception pour les pages d'inscription - permettre la redirection vers onboarding
    const isRegisterPage = pathname?.startsWith("/register/");
    const hasTempToken =
      typeof window !== "undefined" &&
      sessionStorage.getItem("tempToken") !== null;
    const isOnboardingFlow =
      hasTempToken || user?.company?.status === "pending";

    if (
      isInvitePage ||
      hasInviteToken ||
      hasAccessToken ||
      hasMagicLinkFlag ||
      (isRegisterPage && isOnboardingFlow)
    ) {
      console.log(
        "🔗 Contexte invitation/inscription détecté, pas de redirection automatique",
        {
          isInvitePage,
          hasInviteToken,
          hasAccessToken,
          hasMagicLinkFlag,
          isRegisterPage,
          hasTempToken,
          isOnboardingFlow,
          pathname,
        }
      );
      return;
    }

    // Si connecté et pas déjà en train de rediriger
    if (user && user.user_data && !shouldRedirect) {
      // Déterminer dynamiquement la destination si aucune spécifiée
      let target: string = redirectTo || "";

      if (!redirectTo) {
        if (user.company?.type === "transporteur") {
          target = "/transporteur/mandats";
        } else {
          target = "/expediteur";
        }
      }

      if (pathname === target) return; // déjà sur la bonne page

      // Vérifier si l'utilisateur doit compléter son onboarding
      const needsOnboarding =
        user.company?.status === "pending" &&
        (!user.company.name || !user.company.billing_address);

      if (needsOnboarding) {
        console.log(
          "🚀 RedirectIfAuthenticated: Onboarding requis, pas de redirection vers dashboard"
        );
        return;
      }

      console.log(
        "🔄 RedirectIfAuthenticated: Utilisateur connecté, redirection vers",
        redirectTo
      );
      setShouldRedirect(true);

      // Petit délai pour laisser le temps aux cookies de se propager
      setTimeout(() => {
        router.replace(target);
      }, 100);
    }
  }, [
    user,
    loading,
    router,
    redirectTo,
    pathname,
    shouldRedirect,
    searchParams,
  ]);

  // Loading state
  if (loading || (user && user.user_data === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
            aria-label="Chargement"
          />
          <div className="text-lg">Chargement...</div>
        </div>
      </div>
    );
  }

  // En cours de redirection
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
            aria-label="Redirection"
          />
          <div className="text-lg">Connexion réussie</div>
          <div className="text-sm text-gray-600">
            Redirection vers votre tableau de bord...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
