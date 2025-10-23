import { Mandat } from "./mandat";

export type AdminAction = "approve" | "reject";

export interface AdminDecisionRequest {
  reason?: string;
}

export interface AdminDecisionResponse {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    status: string;
    updated_at: string;
  };
}

export interface CompanyModerationData {
  id: string;
  name: string;
  legal_name?: string;
  type: "expediteur" | "transporteur";
  billing_email: string;
  status: "pending" | "approved" | "rejected";
  vat_number?: string;
  rcs?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Relations pour l'affichage admin
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  rejection_reason?: string;
}

export interface MandatModerationData extends Mandat {
  // Relations pour l'affichage admin
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
    type: "expediteur" | "transporteur";
  };
}

export interface AdminStatsData {
  companies: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  mandats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  html: string;
  // Données contextuelles pour personnalisation
  company?: CompanyModerationData;
  mandat?: MandatModerationData;
  action: AdminAction;
  reason?: string;
}
