import { NextRequest } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

export type MemberRole = "owner" | "admin" | "member";

export interface CompanyMembership {
  company_id: string;
  role: MemberRole;
  company?: {
    id: string;
    name: string;
  };
}

export interface AuthMiddlewareResult {
  success: boolean;
  user?: any;
  membership?: CompanyMembership;
  error?: string;
  status?: number;
}

/**
 * Vérifie l'authentification et les droits de l'utilisateur dans son entreprise
 *
 * @param request - La requête HTTP
 * @param requiredRoles - Les rôles autorisés (par défaut: owner et admin)
 * @param includeCompanyData - Inclure les données de l'entreprise dans la réponse
 * @returns Résultat de la vérification avec l'utilisateur et le membership
 */
export async function verifyCompanyRights(
  request: NextRequest,
  requiredRoles: MemberRole[] = ["owner", "admin"],
  includeCompanyData: boolean = true
): Promise<AuthMiddlewareResult> {
  try {
    // Vérification de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Token d'authentification manquant",
        status: 401,
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        error: "Token d'authentification invalide",
        status: 401,
      };
    }

    // Récupérer l'entreprise et les droits avec supabaseAdmin
    const selectQuery = includeCompanyData
      ? `
        company_id,
        role,
        company:companies(id, name)
      `
      : "company_id, role";

    const {
      data: membership,
      error: membershipError,
    }: { data: any; error: any } = await supabaseAdmin
      .from("company_members")
      .select(selectQuery)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "Aucune entreprise associée",
        status: 404,
      };
    }

    // Vérifier les droits
    if (!requiredRoles.includes(membership.role as MemberRole)) {
      return {
        success: false,
        error: "Droits insuffisants",
        status: 403,
      };
    }

    return {
      success: true,
      user,
      membership: membership as CompanyMembership,
    };
  } catch (error) {
    console.error("Erreur dans verifyCompanyRights:", error);
    return {
      success: false,
      error: "Erreur interne du serveur",
      status: 500,
    };
  }
}

/**
 * Vérifie uniquement l'authentification de l'utilisateur (sans vérifier les droits d'entreprise)
 *
 * @param request - La requête HTTP
 * @returns L'utilisateur authentifié ou une erreur
 */
export async function verifyAuthentication(
  request: NextRequest
): Promise<{ success: boolean; user?: any; error?: string; status?: number }> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Token d'authentification manquant",
        status: 401,
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        error: "Token d'authentification invalide",
        status: 401,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Erreur dans verifyAuthentication:", error);
    return {
      success: false,
      error: "Erreur interne du serveur",
      status: 500,
    };
  }
}
