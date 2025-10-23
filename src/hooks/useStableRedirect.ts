import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface RedirectTracker {
  [key: string]: {
    executed: boolean;
    timestamp: number;
  };
}

/**
 * @param Hook pour gérer les redirections de manière stable
 *
 * Évite les redirections multiples vers la même destination
 * et réinitialise automatiquement après un délai
 */
export function useStableRedirect() {
  const router = useRouter();
  const redirectTracker = useRef<RedirectTracker>({});
  const REDIRECT_COOLDOWN = 5000; // 5 secondes

  const stableRedirect = useCallback(
    (path: string, reason?: string) => {
      const now = Date.now();
      const existing = redirectTracker.current[path];

      // Si la redirection a déjà été effectuée récemment, ne pas la refaire
      if (
        existing &&
        existing.executed &&
        now - existing.timestamp < REDIRECT_COOLDOWN
      ) {
        console.log(
          `🚫 useStableRedirect: Redirection vers ${path} ignorée (cooldown)`,
          reason
        );
        return false;
      }

      // Marquer la redirection comme exécutée
      redirectTracker.current[path] = {
        executed: true,
        timestamp: now,
      };

      console.log(`🔄 useStableRedirect: Redirection vers ${path}`, reason);
      router.push(path);
      return true;
    },
    [router]
  );

  const resetRedirect = useCallback((path: string) => {
    delete redirectTracker.current[path];
    console.log(`🔄 useStableRedirect: Reset redirection pour ${path}`);
  }, []);

  const resetAllRedirects = useCallback(() => {
    redirectTracker.current = {};
    console.log("🔄 useStableRedirect: Reset toutes les redirections");
  }, []);

  return {
    stableRedirect,
    resetRedirect,
    resetAllRedirects,
  };
}
