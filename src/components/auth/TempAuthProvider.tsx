"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../../../supabase/supabase";
import { AuthUser } from "@/types/auth";

interface TempAuthContextType {
  tempUser: AuthUser | null;
  loading: boolean;
  authenticateTempUser: (tempToken: string) => Promise<void>;
}

const TempAuthContext = createContext<TempAuthContextType | undefined>(
  undefined
);

export function TempAuthProvider({ children }: { children: ReactNode }) {
  const [tempUser, setTempUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);

  /**
   * @param Authentification temporaire pour l'onboarding
   *
   * Récupère les données utilisateur avec le token temporaire
   */
  const authenticateTempUser = useCallback(
    async (tempToken: string) => {
      // Éviter les appels multiples
      if (isAuthenticating || hasAttemptedAuth) {
        return;
      }

      try {
        setIsAuthenticating(true);
        setLoading(true);
        setHasAttemptedAuth(true);

        // Récupérer les données utilisateur
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("uid", tempToken)
          .single();

        if (userError || !userData) {
          console.error(
            "authenticateTempUser - Erreur récupération utilisateur:",
            userError
          );
          // Nettoyer le token invalide
          sessionStorage.removeItem("tempToken");
          setTempUser(null);
          setLoading(false);
          return;
        }

        // Créer l'objet utilisateur temporaire
        const tempAuthUser: AuthUser = {
          id: tempToken,
          email: userData.email,
          user_data: userData,
          company: null,
          company_membership: null,
        };

        setTempUser(tempAuthUser);
      } catch (error) {
        console.error("authenticateTempUser - Erreur générale:", error);
        // Nettoyer le token en cas d'erreur
        sessionStorage.removeItem("tempToken");
        setTempUser(null);
      } finally {
        setLoading(false);
        setIsAuthenticating(false);
      }
    },
    [isAuthenticating, hasAttemptedAuth]
  );

  useEffect(() => {
    // Vérifier s'il y a un token temporaire dans sessionStorage
    const tempToken = sessionStorage.getItem("tempToken");

    if (tempToken && !tempUser && !isAuthenticating && !hasAttemptedAuth) {
      authenticateTempUser(tempToken);
    } else if (!tempToken && !tempUser) {
      setLoading(false);
      setHasAttemptedAuth(true);
    } else if (tempUser) {
      setLoading(false);
      setHasAttemptedAuth(true);
    } else if (hasAttemptedAuth && !tempUser && !tempToken) {
      setLoading(false);
    }
  }, [tempUser, isAuthenticating, hasAttemptedAuth, authenticateTempUser]);

  return (
    <TempAuthContext.Provider
      value={{ tempUser, loading, authenticateTempUser }}
    >
      {children}
    </TempAuthContext.Provider>
  );
}

export function useTempAuth() {
  const context = useContext(TempAuthContext);
  if (context === undefined) {
    throw new Error("useTempAuth must be used within a TempAuthProvider");
  }
  return context;
}
