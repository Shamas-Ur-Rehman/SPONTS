export interface AddressData {
  adresse: string;
  lat?: number;
  lng?: number;
}

export interface MandatCreationData {
  nom: string;
  description: string;
  images: string[];
  adresse_depart: AddressData;
  adresse_arrivee: AddressData;
  heure_souhaitee: string;
}

export type TransporteurStatus =
  | "accepted"
  | "picked_up"
  | "delivered"
  | "delivery_problem";

export interface Mandat {
  // Champs système
  id: number;
  uid: string;
  created_by: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  status?: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  moderated_by?: string;
  moderated_at?: string;

  // Champs transporteur
  transporteur_company_id?: string;
  transporteur_company_user?: string;
  transporteur_status?: TransporteurStatus;
  accepte_at?: string;

  // Informations générales (Étape 1)
  nom?: string;
  description?: string;
  images?: string[];
  mandat_uuid?: string;

  // Adresses & contacts (Étape 2)
  depart_adresse?: string;
  depart_lat?: number;
  depart_lng?: number;
  depart_contact?: string;
  arrivee_adresse?: string;
  arrivee_lat?: number;
  arrivee_lng?: number;
  arrivee_contact?: string;
  depart_horaires_ouverture?: string;
  arrivee_horaires_ouverture?: string;

  // Horaires d'enlèvement (Étape 3)
  enlevement_souhaite_debut_at?: string;
  enlevement_souhaite_fin_at?: string;
  enlevement_confirme_debut_at?: string;
  enlevement_confirme_fin_at?: string;
  enlevement_max_at?: string;
  enlevement_effectif_at?: string;
  livraison_prevue_debut_at?: string;
  livraison_prevue_fin_at?: string;
  livraison_effective_at?: string;

  // Caractéristiques marchandise (Étape 4)
  type_marchandise?: string;
  poids_total_kg?: number;
  volume_total_m3?: number;
  nombre_colis?: number;
  type_vehicule?: string;
  type_acces?: string;
  acces_autre?: string;
  moyen_chargement?: string;
  sensi_temperature?: boolean;
  temperature_min_c?: number;
  temperature_max_c?: number;
  matiere_dangereuse?: boolean;
  adr_classe?: number;
  adr_uno?: string;

  // Calculs et tarification
  distance_km?: number;
  duree_estimee_min?: number;
  surface_m2?: number;
  tarif_km_base_chf?: number;
  maj_carburant_pct?: number;
  maj_embouteillage_pct?: number;
  autre_supp?: JSON;
  surcharge_grue_pct?: number;
  surcharge_grue_chf?: number;
  tva_rate_pct?: number;
  prix_base_ht?: number;
  prix_estime_ht?: number;
  prix_estime_ttc?: number;
  monnaie?: string;

  // Facturation et documents
  facture_id?: string;
  statut_facturation?: string;
  notes_calcul_json?: any;
  preuve_livraison?: string;
  documents?: string[];
  commentaire_transporteur?: string;
  commentaire_expediteur?: string;

  // Annulation
  annule_par?: string;
  raison_annulation?: string;
  date_creation?: string;
  cree_par?: string;

  // Compatibilité (ancien format)
  payload?: MandatCreationData;
}

export interface CreateMandatRequest {
  mandat: MandatCreationData;
}

export interface CreateMandatResponse {
  success: boolean;
  mandat?: Mandat;
  error?: string;
}

// Types pour les API transporteur
export interface MarketplaceMandat extends Mandat {
  company?: {
    name: string;
    legal_name?: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
  };
}

export interface AcceptMandatRequest {
  mandatId: number;
}

export interface AcceptMandatResponse {
  success: boolean;
  mandat?: Mandat;
  error?: string;
}

export interface UpdateTransporteurStatusRequest {
  status: TransporteurStatus;
}

export interface UpdateTransporteurStatusResponse {
  success: boolean;
  mandat?: Mandat;
  error?: string;
}
