import { Company, CompanyMember } from './company';

export type UserRole = "expediteur" | "transporteur";

export interface User {
  id: number;
  uid: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  email: string;
  created_at: string;
  updated_at: string;
}

// UserMetadata est maintenant remplacé par Company

export interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  user_data?: User | null;
  company?: Company | null;
  company_membership?: CompanyMember | null;
  // Propriété calculée pour compatibilité
  active_company_id?: string | null;
  // Autres propriétés optionnelles de Supabase User
  [key: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
