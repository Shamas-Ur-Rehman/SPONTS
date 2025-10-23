import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase/supabase";
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
} from "@/types/auth";
import { Company } from "@/types/company";

// Vérification du JWT avant de faire la requête
const sessionResult = await supabase.auth.getSession();
if (sessionResult.data.session?.access_token) {
  console.log("token détecté !!!!.");
} else {
  await supabase.auth.refreshSession();
  console.log("Nouveau token généré.");
}
// --- Cache mémoire ultra-léger des données utilisateur (5 min) ---
const userCache: Map<
  string,
  {
    data: {
      user: any;
      company: any;
      membership: any;
    };
    ts: number;
  }
> = new Map();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  /**
   * Récupération simple des données utilisateur avec jointure company
   */
  const fetchUserData = useCallback(async (userId: string) => {
    console.log("🔄 fetchUserData: Chargement ultra-optimisé pour", userId);

    try {
      // 1) Vérifier le cache
      const cached = userCache.get(userId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        console.log("⚡️ fetchUserData: retourné depuis le cache");
        return cached.data;
      }

      // 2) Requête Supabase (pas de timeout local ‑ on simplifie)
      const queryPromise = supabase
        .from("users")
        .select(
          `
          *,
          companies:company_id (
            id,
            name,
            legal_name,
            type,
            vat_number,
            billing_email,
            billing_address,
            status,
            created_by,
            created_at,
            updated_at,
            rcs,
            rejection_reason
          ),
          company_members_data:company_members (
            id,
            company_id,
            user_id,
            role,
            invited_by,
            created_at
          )
        `
        )
        .eq("uid", userId)
        .single();

      const { data: userData, error: userError } = await queryPromise;

      // Log de debug uniquement en cas d'erreur
      if (userError) {
        console.log("🔍 fetchUserData: Erreur de requête", {
          hasData: !!userData,
          hasError: !!userError,
          errorMessage: userError?.message,
          userId: (userData as any)?.uid,
        });
      }

      if (userError || !userData) {
        console.warn(
          "❌ fetchUserData: Utilisateur introuvable avec requête complexe, tentative requête simple",
          userError?.message
        );

        // 🔧 CORRECTION : Fallback avec une requête simple
        try {
          console.log(
            "🔄 fetchUserData: Tentative requête simple pour",
            userId
          );
          const { data: simpleUserData, error: simpleError } = await supabase
            .from("users")
            .select("*")
            .eq("uid", userId)
            .single();

          if (simpleError || !simpleUserData) {
            console.warn(
              "❌ fetchUserData: Utilisateur introuvable même avec requête simple",
              simpleError?.message
            );
            return { user: null, company: null, membership: null };
          }

          console.log(
            "✅ fetchUserData: Utilisateur trouvé avec requête simple",
            simpleUserData
          );
          return { user: simpleUserData, company: null, membership: null };
        } catch (fallbackError) {
          console.error(
            "❌ fetchUserData: Erreur même avec requête simple",
            fallbackError
          );
          return { user: null, company: null, membership: null };
        }
      }

      // Extraire les données des jointures
      const companyData = userData.companies || null;
      const membershipData = userData.company_members_data || null;

      // Nettoyer les données utilisateur (enlever les relations pour éviter conflits)
      const cleanUserData = { ...userData };
      delete cleanUserData.companies;
      delete cleanUserData.company_members_data;

      console.log(
        "🚀 fetchUserData: TOUTES les données récupérées en UNE requête !",
        {
          user: !!cleanUserData,
          company: !!companyData,
          membership: !!membershipData,
          company_id: cleanUserData.company_id,
          company_members_id: cleanUserData.company_members,
          role: membershipData?.role,
          userData: cleanUserData,
          companyData: companyData,
          membershipData: membershipData,
        }
      );

      const result = {
        user: cleanUserData,
        company: companyData,
        membership: membershipData,
      };

      // 3) Mise en cache
      userCache.set(userId, { data: result, ts: Date.now() });

      return result;
    } catch (error) {
      console.error("❌ fetchUserData: Erreur inattendue", error);
      // 🔧 CORRECTION : Log plus détaillé pour diagnostiquer
      if (error instanceof Error) {
        console.error("❌ fetchUserData: Détails de l'erreur", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      return { user: null, company: null, membership: null };
    }
  }, []);

  /**
   * Nettoyage simple de la session
   */
  const clearSession = useCallback(async (reason?: string) => {
    console.log("🔄 Nettoyage de session:", reason || "Déconnexion");

    try {
      await supabase.auth.signOut();

      // Nettoyer les tokens locaux
      sessionStorage.removeItem("tempToken");
      sessionStorage.removeItem("temp_token");

      // Nettoyer les flags d'invitation
      localStorage.removeItem("magic_link_invitation");
      localStorage.removeItem("invitation_token");
      localStorage.removeItem("invitation_completed");
    } catch (error) {
      console.error("Erreur nettoyage:", error);
    }

    setAuthState({ user: null, loading: false });

    // Redirection vers login
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login")
    ) {
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next");
      const target = next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";
      window.location.assign(target);
    }
  }, []);

  /**
   * Initialisation de la session
   */
  const initializeSession = useCallback(async () => {
    console.log("🔄 useAuth: Initialisation de la session");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("✅ useAuth: Session trouvée pour", session.user.id);

        const { user, company, membership } = await fetchUserData(
          session.user.id
        );

        if (!user) {
          // Vérifier si contexte invitation/onboarding/callback
          const isOnSpecialPage =
            typeof window !== "undefined" &&
            (window.location.pathname.startsWith("/invite/") ||
              window.location.pathname.startsWith("/onboarding/") ||
              window.location.pathname.startsWith("/auth/callback") ||
              window.location.pathname.startsWith("/register/invite"));

          if (isOnSpecialPage) {
            console.log(
              "🔗 useAuth: Contexte invitation/onboarding/callback, état minimal"
            );
            setAuthState({
              user: {
                ...session.user,
                email: session.user.email || "",
                user_data: null,
                company: null,
                company_membership: null,
                active_company_id: null,
                active_company_role: null,
              } as any,
              loading: false,
            });
            return;
          }

          await clearSession("Utilisateur non trouvé");
          return;
        }

        setAuthState({
          user: {
            ...session.user,
            email: session.user.email || "",
            user_data: user,
            company: company,
            company_membership: membership,
            active_company_id: membership?.company_id || null,
            active_company_role: membership?.role || null,
          } as any,
          loading: false,
        });
      } else {
        console.log("🔄 useAuth: Aucune session active");
        setAuthState({ user: null, loading: false });
      }
    } catch (error) {
      console.error("useAuth: Erreur d'initialisation", error);
      await clearSession("Erreur d'initialisation");
    }
  }, [fetchUserData, clearSession]);

  useEffect(() => {
    // Initialiser
    initializeSession();

    // Écouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 useAuth: Auth event", event);

      if (event === "SIGNED_OUT") {
        await clearSession("Déconnexion");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("🔄 useAuth: Token rafraîchi");
        return;
      }

      if (
        session?.user &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        console.log(
          "🔄 useAuth: Récupération des données utilisateur pour",
          session.user.id
        );
        const { user, company, membership } = await fetchUserData(
          session.user.id
        );

        if (user) {
          console.log("✅ useAuth: Utilisateur trouvé, mise à jour de l'état");
          setAuthState({
            user: {
              ...session.user,
              email: session.user.email || "",
              user_data: user,
              company: company,
              company_membership: membership,
              active_company_id: membership?.company_id || null,
              active_company_role: membership?.role || null,
            } as any,
            loading: false,
          });
        } else {
          console.log(
            "❌ useAuth: Utilisateur non trouvé dans la base de données"
          );
          // 🔧 CORRECTION : Mettre à jour l'état même si l'utilisateur n'est pas trouvé
          setAuthState({
            user: null,
            loading: false,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [initializeSession, fetchUserData, clearSession]);

  /**
   * Vérification admin
   */
  const isAdmin = useCallback((email?: string): boolean => {
    const adminEmails =
      process.env.NEXT_PUBLIC_SPONTIS_ADMIN_EMAILS ||
      process.env.SPONTIS_ADMIN_EMAILS ||
      "";
    if (!adminEmails || !email) return false;
    const allowedEmails = adminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase());
    return allowedEmails.includes(email.toLowerCase());
  }, []);

  /**
   * Vérification statut company
   */
  const checkCompanyStatus = useCallback(
    (company: Company | null, userEmail: string) => {
      // Admins ont toujours accès
      if (isAdmin(userEmail)) {
        return { canAccess: true };
      }

      // Pas d'entreprise = accès autorisé (onboarding)
      if (!company) {
        return { canAccess: true };
      }

      switch (company.status) {
        case "approved":
          return { canAccess: true };

        case "pending":
          return {
            canAccess: false,
            redirectUrl: `/auth/pending?company=${encodeURIComponent(
              company.name || ""
            )}`,
            errorMessage: "Votre entreprise est en cours de validation.",
          };

        case "rejected":
          const reason = company.rejection_reason || "Aucun motif spécifié";
          return {
            canAccess: false,
            redirectUrl: `/auth/rejected?reason=${encodeURIComponent(
              reason
            )}&company=${encodeURIComponent(company.name || "")}`,
            errorMessage: `Demande refusée. Motif: ${reason}`,
          };

        default:
          return { canAccess: true };
      }
    },
    [isAdmin]
  );

  /**
   * Connexion
   */
  const signIn = async ({ email, password }: LoginCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message?.includes("Invalid login credentials")) {
        throw new Error("Email ou mot de passe incorrect");
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Erreur lors de la connexion");
    }

    const { user, company, membership } = await fetchUserData(data.user.id);
    if (!user) {
      throw new Error("Erreur lors de la récupération des données");
    }

    // Mettre à jour l'état immédiatement après connexion réussie
    setAuthState({
      user: {
        ...data.user,
        email: data.user.email || "",
        user_data: user,
        company: company,
        company_membership: membership,
        active_company_id: membership?.company_id || null,
        active_company_role: membership?.role || null,
      } as any,
      loading: false,
    });

    // Vérification du statut de l'entreprise (seulement pour bloquer les rejected/pending)
    const statusCheck = checkCompanyStatus(company, data.user.email || "");
    if (!statusCheck.canAccess) {
      console.log(
        `🔒 signIn: Statut entreprise non autorisé: ${company?.status}`
      );
      // Pour pending/rejected, rediriger SANS déconnecter l'utilisateur
      if (typeof window !== "undefined" && statusCheck.redirectUrl) {
        window.location.href = statusCheck.redirectUrl;
      }
      throw new Error(statusCheck.errorMessage || "Accès non autorisé");
    }

    // Synchroniser les cookies côté serveur
    if (data.session?.access_token && data.session?.refresh_token) {
      try {
        await fetch("/api/auth/session-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
        console.log("✅ signIn: Cookies serveur synchronisés");
      } catch (syncError) {
        console.warn("⚠️ signIn: Erreur sync cookies:", syncError);
      }
    }

    // Invalider le cache utilisateur pour forcer un refetch propre
    userCache.delete(data.user.id);

    return {
      message: "Connexion réussie",
      user: data.user,
      session: data.session,
    };
  };

  /**
   * Inscription
   */
  const signUp = async ({
    email,
    password,
    first_name,
    last_name,
    role,
  }: RegisterCredentials) => {
    // Étape 1: Créer le compte via l'API
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, first_name, last_name, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de l'inscription");
    }

    // Étape 2: Connexion automatique après inscription
    try {
      console.log("🔐 signUp: Connexion automatique après inscription...");

      // Avec la nouvelle architecture, plus besoin d'attendre - les données sont créées immédiatement
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

      console.log("🔍 signUp: Résultat connexion automatique:", {
        success: !signInError,
        hasUser: !!signInData?.user,
        hasSession: !!signInData?.session,
        error: signInError?.message,
        userId: signInData?.user?.id,
      });

      if (signInError) {
        console.warn(
          "⚠️ signUp: Connexion automatique échouée, mais compte créé:",
          signInError
        );
        // Stocker le UID pour l'onboarding même si la connexion échoue
        if (data.user?.uid) {
          sessionStorage.setItem("tempToken", data.user.uid);
        }
        return { ...data, needsManualLogin: true };
      }

      if (signInData.user) {
        console.log("✅ signUp: Connexion automatique réussie");

        // Stocker le token temporaire pour l'onboarding
        sessionStorage.setItem("tempToken", signInData.user.id);

        // Mettre à jour l'état avec les données de base (sans attendre fetchUserData)
        setAuthState({
          user: {
            ...signInData.user,
            email: signInData.user.email || "",
            user_data: null, // Sera chargé plus tard
            company: null, // Sera chargé plus tard
            company_membership: null, // Sera chargé plus tard
            active_company_id: null,
            active_company_role: null,
          } as any,
          loading: false,
        });

        // Synchroniser les cookies côté serveur IMMÉDIATEMENT
        if (
          signInData.session?.access_token &&
          signInData.session?.refresh_token
        ) {
          console.log("🔄 signUp: Synchronisation cookies serveur...");
          try {
            await fetch("/api/auth/session-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
              }),
            });
            console.log("✅ signUp: Cookies serveur synchronisés");
          } catch (syncError) {
            console.warn("⚠️ signUp: Erreur sync cookies:", syncError);
          }
        }

        // Essayer de récupérer les données en arrière-plan sans bloquer
        fetchUserData(signInData.user.id)
          .then(({ user, company, membership }) => {
            if (user) {
              console.log("🔄 signUp: Mise à jour état avec données complètes");
              setAuthState((prev) => ({
                ...prev,
                user: prev.user
                  ? {
                      ...prev.user,
                      user_data: user,
                      company: company,
                      company_membership: membership,
                      active_company_id: membership?.company_id || null,
                      active_company_role: membership?.role || null,
                    }
                  : null,
              }));
            }
          })
          .catch((error) => {
            console.warn(
              "⚠️ signUp: Erreur fetchUserData en arrière-plan:",
              error
            );
            // Ne pas bloquer l'inscription pour cette erreur
          });

        return {
          ...data,
          session: signInData.session,
          user: signInData.user,
          needsOnboarding: true,
          redirectTo:
            role === "transporteur"
              ? "/onboarding/transporteur"
              : "/onboarding/expediteur",
        };
      }
    } catch (error) {
      console.warn(
        "⚠️ signUp: Erreur lors de la connexion automatique:",
        error
      );
      // Stocker le UID pour l'onboarding même si la connexion échoue
      if (data.user?.uid) {
        sessionStorage.setItem("tempToken", data.user.uid);
      }
    }

    return { ...data, needsManualLogin: true };
  };

  /**
   * Déconnexion
   */
  const signOut = async () => {
    await clearSession("Déconnexion manuelle");

    // Nettoyage complet du cache
    userCache.clear();
  };

  /**
   * Mise à jour utilisateur
   */
  const updateUserData = async (updates: Partial<User>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilisateur non connecté");

    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("uid", user.id)
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour l'état local
    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, user_data: data } : null,
    }));

    return data;
  };

  /**
   * Mise à jour company
   */
  const updateCompany = async (updates: Partial<Record<string, unknown>>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilisateur non connecté");

    // Récupérer l'entreprise via company_id dans users
    const { data: userData } = await supabase
      .from("users")
      .select("company_id")
      .eq("uid", user.id)
      .single();

    if (!userData?.company_id) {
      throw new Error("Aucune entreprise associée");
    }

    const { data, error } = await supabase
      .from("companies")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userData.company_id)
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour l'état local
    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, company: data } : null,
    }));

    return data;
  };

  /**
   * Finaliser inscription
   */
  const finalizeSignup = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilisateur non connecté");

    const { data: userData } = await supabase
      .from("users")
      .select("company_id")
      .eq("uid", user.id)
      .single();

    if (!userData?.company_id) {
      throw new Error("Aucune entreprise associée");
    }

    const { data, error } = await supabase
      .from("companies")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", userData.company_id)
      .select()
      .single();

    if (error) throw error;

    setAuthState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, company: data } : null,
    }));

    return { message: "Inscription finalisée avec succès", company: data };
  };

  return {
    user: authState.user,
    loading: authState.loading,
    signIn,
    signUp,
    signOut,
    updateUserData,
    updateCompany,
    finalizeSignup,
    isAdmin,
    checkCompanyStatus,
    handleTokenExpiration: clearSession,
  };
}
