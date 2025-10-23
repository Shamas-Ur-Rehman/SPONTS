"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useCallback } from "react";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireOnboardingCompleted?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireOnboardingCompleted = true,
  redirectTo = "/expediteur",
}: ProtectedRouteProps) {
  const { user, loading, checkCompanyStatus } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Vérification unifiée du statut et des autorisations
   * Centralise toute la logique de vérification pour éviter les redondances
   */
  const performAuthorizationCheck = useCallback(async () => {
    if (loading) {
      return;
    }

    // Non connecté → redirection vers login
    if (!user) {
      console.log("🔄 ProtectedRoute: Redirection vers login depuis", pathname);
      const next = encodeURIComponent(pathname || "/expediteur");
      router.push(`/login?next=${next}`);
      return;
    }

    // Vérifier si l'utilisateur vient d'une invitation mais n'a pas encore créé son compte
    const isFromInvitation =
      typeof window !== "undefined" &&
      localStorage.getItem("magic_link_invitation") === "true" &&
      localStorage.getItem("invitation_token");

    if (isFromInvitation && pathname?.startsWith("/expediteur")) {
      const invitationToken =
        typeof window !== "undefined"
          ? localStorage.getItem("invitation_token")
          : null;
      const target = `/register/invite${
        invitationToken ? `?token=${invitationToken}` : ""
      }`;
      console.log(
        "🔐 ProtectedRoute: Invitation en cours, redirection vers création de compte",
        target
      );
      router.replace(target);
      return;
    }

    // Priorité: Vérification du statut de l'entreprise (sauf pour l'onboarding)
    if (user.company && !pathname?.includes("/onboarding")) {
      console.log(
        `🔍 ProtectedRoute: Vérification statut entreprise: ${user.company.status}`
      );

      const statusCheck = checkCompanyStatus(user.company, user.email || "");
      if (!statusCheck.canAccess) {
        console.log(
          `🔒 ProtectedRoute: Accès refusé - ${statusCheck.errorMessage}`
        );
        // Redirection directe vers la page dédiée
        const redirectUrl = statusCheck.redirectUrl || "/login";
        console.log(`🔄 ProtectedRoute: Redirection vers ${redirectUrl}`);
        window.location.href = redirectUrl;
        return;
      }
    }

    // Vérification du rôle si requis
    if (
      requiredRole &&
      user.user_data &&
      user.user_data.role !== requiredRole
    ) {
      console.log(
        "🔄 ProtectedRoute: Rôle incorrect, redirection vers",
        redirectTo
      );
      router.replace(redirectTo);
      return;
    }

    // Vérification de l'onboarding si requis
    if (requireOnboardingCompleted && !pathname?.includes("/onboarding")) {
      // Si l'utilisateur a un membership d'entreprise, pas besoin d'onboarding
      if (user.company_membership) {
        console.log(
          "🎉 ProtectedRoute: Membre d'entreprise, accès direct au dashboard"
        );
        return;
      }

      // Si l'utilisateur vient d'une invitation et a complété l'inscription
      const invitationCompleted =
        typeof window !== "undefined" &&
        localStorage.getItem("invitation_completed") === "true";

      if (invitationCompleted) {
        console.log("🎉 ProtectedRoute: Invitation complétée, accès autorisé");
        return;
      }

      // Onboarding complété si l'utilisateur a une company avec des données complètes
      // OU s'il est membre d'une entreprise (même sans billing_address complet)
      const hasCompletedOnboarding = Boolean(
        (user.company &&
          user.company_membership &&
          user.company.name &&
          user.company.billing_address) ||
          (user.company_membership && user.company)
      );

      console.log("🔍 ProtectedRoute: Debug onboarding", {
        hasCompletedOnboarding,
        isFromInvitation,
        active_company_id: user.active_company_id,
        company: !!user.company,
        company_membership: !!user.company_membership,
        company_name: user.company?.name || null,
        company_address: !!user.company?.billing_address,
        company_id: (user.company_membership as any)?.company_id || null,
        userMetadata: user.user_metadata,
      });

      // Vérifier si l'utilisateur a des metadata d'invitation mais pas de company
      // Cela peut arriver si le magic link a connecté l'utilisateur mais qu'il n'a pas encore accepté l'invitation
      if (
        (user.user_metadata as any)?.from_invitation === true ||
        (user.user_metadata as any)?.invitation_token
      ) {
        if (!user.company && !user.company_membership) {
          const invitationToken = (user.user_metadata as any)?.invitation_token;
          console.log(
            "🔄 ProtectedRoute: Utilisateur invité sans company détecté, redirection vers invitation"
          );

          if (invitationToken) {
            localStorage.setItem("magic_link_invitation", "true");
            localStorage.setItem("invitation_token", invitationToken);
            router.push(`/register/invite?token=${invitationToken}`);
            return;
          }
        }
      }

      if (!hasCompletedOnboarding) {
        const role = user.user_data?.role;
        console.log("🔄 ProtectedRoute: Onboarding non complété, redirection");

        if (role === "transporteur") {
          router.push("/onboarding/transporteur");
        } else if (role === "expediteur") {
          router.push("/onboarding/expediteur");
        }
        return;
      }
    }

    // Si on arrive ici, l'utilisateur est autorisé
    // Pas besoin de setIsAuthorized(true)
  }, [
    user,
    loading,
    router,
    pathname,
    requiredRole,
    requireOnboardingCompleted,
    redirectTo,
    checkCompanyStatus,
  ]);

  useEffect(() => {
    performAuthorizationCheck();
  }, [performAuthorizationCheck]);

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

  // Vérification directe au lieu d'utiliser isAuthorized
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
            aria-label="Vérification"
          />
          <div className="text-lg">Redirection...</div>
        </div>
      </div>
    );
  }

  // Utilisateur autorisé - afficher le contenu
  return <>{children}</>;
}
