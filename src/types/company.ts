export type CompanyType = 'expediteur' | 'transporteur';
export type CompanyStatus = 'pending' | 'approved' | 'rejected';
export type MemberRole = 'owner' | 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Company {
  id: string;
  name: string;
  legal_name?: string;
  type: CompanyType;
  vat_number?: string;
  rcs?: string;
  billing_email: string;
  billing_address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  status: CompanyStatus;
  rejection_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: MemberRole;
  invited_by?: string;
  created_at: string;
  // Relations optionnelles
  company?: Company;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: Exclude<MemberRole, 'owner'>;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  invited_by: string;
  created_at: string;
  // Relations optionnelles
  company?: Company;
  invited_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}
