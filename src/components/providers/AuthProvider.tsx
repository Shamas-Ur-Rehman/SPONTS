"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "@/types/auth";
import { Company } from "@/types/company";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<unknown>;
  signUp: (credentials: RegisterCredentials) => Promise<unknown>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<User>) => Promise<User>;
  updateCompany: (
    updates: Partial<Record<string, unknown>>
  ) => Promise<Company>;
  finalizeSignup: () => Promise<unknown>;
  handleTokenExpiration: (reason?: string) => Promise<void>;
  // Nouvelles fonctions utilitaires
  isAdmin: (email?: string) => boolean;
  checkCompanyStatus: (company: Company | null, userEmail: string) => { 
    canAccess: boolean; 
    redirectUrl?: string; 
    errorMessage?: string; 
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: auth.user,
      loading: auth.loading,
      signIn: auth.signIn,
      signUp: auth.signUp,
      signOut: auth.signOut,
      updateUserData: auth.updateUserData,
      updateCompany: auth.updateCompany,
      finalizeSignup: auth.finalizeSignup,
      handleTokenExpiration: auth.handleTokenExpiration,
      // Nouvelles fonctions utilitaires
      isAdmin: auth.isAdmin,
      checkCompanyStatus: auth.checkCompanyStatus,
    }),
    [
      auth.user,
      auth.loading,
      auth.signIn,
      auth.signUp,
      auth.signOut,
      auth.updateUserData,
      auth.updateCompany,
      auth.finalizeSignup,
      auth.handleTokenExpiration,
      auth.isAdmin,
      auth.checkCompanyStatus,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}