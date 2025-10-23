"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuthContext();

  /**
   * @param Redirection des utilisateurs non connectés
   *
   * Les utilisateurs connectés sont gérés par OnboardingRedirect
   */
  useEffect(() => {
    if (loading) return;

    // Vérifier si on a un contexte d'invitation
    const hasInviteToken =
      typeof window !== "undefined" &&
      (window.location.search.includes("token=") ||
        window.location.hash.includes("access_token"));

    if (hasInviteToken) {
      console.log(
        "🔗 Page principale: Contexte invitation détecté, pas de redirection"
      );
      return;
    }
    // Forcer la page de création de compte si invitation en cours
    const magicLinkInvitation =
      typeof window !== "undefined" &&
      localStorage.getItem("magic_link_invitation") === "true";
    if (magicLinkInvitation) {
      const invitationToken =
        typeof window !== "undefined"
          ? localStorage.getItem("invitation_token")
          : null;
      const target = invitationToken
        ? `/register/invite?token=${invitationToken}`
        : "/register/invite";
      console.log(
        "🔐 Invitation en cours, redirection vers création de compte:",
        target
      );
      router.replace(target);
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
    // Si connecté, envoyer vers l'espace expéditeur par défaut (OnboardingRedirect gère aussi)
    router.replace("/expediteur");
  }, [user, loading, router]);

  // Écran minimal stable pendant la redirection
  return <div className="min-h-screen" aria-hidden />;
}
