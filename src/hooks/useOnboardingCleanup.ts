import { useEffect, useCallback } from "react";

/**
 * Hook pour nettoyer les tokens lors de la sortie de l'onboarding
 * Nettoie tempToken et tokens Supabase si l'utilisateur quitte la page
 */
export function useOnboardingCleanup() {
  /**
   * @param Nettoyage complet des tokens
   *
   * Supprime tempToken et tokens Supabase du storage
   */
  const cleanupTokens = useCallback(() => {
    try {
      // Nettoyer le tempToken du sessionStorage
      sessionStorage.removeItem("tempToken");

      // Nettoyer les tokens Supabase du localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.includes("-auth-token")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Erreur lors du nettoyage des tokens:", error);
    }
  }, []);

  /**
   * @param Gestion de la sortie de page
   *
   * Détecte quand l'utilisateur quitte la page d'onboarding
   */
  useEffect(() => {
    // Fonction appelée avant le déchargement de la page
    const handleBeforeUnload = () => {
      cleanupTokens();
    };

    // Fonction appelée lors du retour en arrière du navigateur
    const handlePopState = () => {
      // Délai pour laisser le temps à la navigation de se faire
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/onboarding/")) {
          cleanupTokens();
        }
      }, 100);
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Écouter les changements de route Next.js
    // Note: Pour Next.js 13+ avec App Router, on peut utiliser usePathname + useEffect
    // mais ici on utilise une approche plus universelle

    return () => {
      // Nettoyer les écouteurs
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [cleanupTokens]);

  // Fonction pour forcer le nettoyage (utilisable depuis le composant)
  const forceCleanup = useCallback(() => {
    cleanupTokens();
  }, [cleanupTokens]);

  return {
    forceCleanup,
  };
}
