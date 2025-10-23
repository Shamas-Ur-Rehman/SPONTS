// src/types/mandat-form.ts

/* ---------- ENUMS ---------- */

export enum TypeMarchandise {
  Bobine = "bobine",
  Fut = "fut",
  IBC = "ibc",
  PaletteEuro = "palette_euro",
  PaletteHorsNorme = "palette_hors_norme",
  ColisMoins50Kg = "colis_<50kg",
  DemiPalette = "demi_palette",
}

export enum TypeVehicule {
  Camionnette = "camionnette",
  CamionSolo7m = "camion_solo_7m",
  Semi11m = "semi_11m",
  Semi13_5m = "semi_13_5m",
  Bache = "bache",
  Isotherme = "isotherme",
}

export enum TypeAcces {
  Residentiel = "residentiel",
  LimitePoids32t = "limite_poids_32t",
  LimiteHauteur3_80m = "limite_hauteur_3_80m",
  DepotSansQuai = "depot_sans_quai",
  DepotAvecQuai = "depot_avec_quai",
  Autre = "autre",
}

export enum MoyenChargement {
  Hayon = "hayon",
  Grue = "grue",
  Transpalette = "transpalette",
  Aucun = "aucun",
}

export type ADRClasse = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/* ---------- TYPES PAR ÉTAPE ---------- */

// Étape 1 – Informations générales
export interface Step1General {
  nom: string; // <=120 caractères
  description: string; // >=10 caractères
  images: string[]; // URLs déjà uploadées vers le storage
}

// Étape 2 – Adresses & contacts
export interface AddressData {
  adresse: string;
  lat: number; // 6 décimales mini
  lng: number; // 6 décimales mini
}

export interface Step2Adresses {
  depart_adresse: AddressData;
  depart_contact?: string;
  arrivee_adresse: AddressData;
  arrivee_contact?: string;
  depart_horaires_ouverture?: string;
  arrivee_horaires_ouverture?: string;
  // Nouveaux champs détaillés pour les adresses
  depart_pays?: string;
  depart_canton?: string;
  depart_ville?: string;
  depart_code_postal?: string;
  depart_telephone?: string;
  arrivee_pays?: string;
  arrivee_canton?: string;
  arrivee_ville?: string;
  arrivee_code_postal?: string;
  arrivee_telephone?: string;
}

// Étape 3 – Horaires d'enlèvement et livraison
export interface Step3Horaires {
  enlevement_souhaite_debut_at: string; // ISO string
  enlevement_souhaite_fin_at: string; // ISO string, >= début
  enlevement_max_at?: string; // ISO string - deadline max pour enlèvement
  livraison_prevue_debut_at?: string; // ISO string
  livraison_prevue_fin_at?: string; // ISO string, >= début livraison
}

// Étape 4 – Caractéristiques marchandise
export interface Step4Marchandise {
  type_marchandise?: TypeMarchandise;
  poids_total_kg: number; // >=0.1
  volume_total_m3: number; // >=0.01
  surface_m2: number; // >=0.01
  distance_km?: number;
  prix_estime_ht?: number;
  prix_estime_ttc?: number;
  nombre_colis?: number; // >=0
  type_vehicule?: TypeVehicule;
  type_acces?: TypeAcces;
  acces_autre?: string; // requis si type_acces === Autre
  moyen_chargement?: MoyenChargement;
  sensi_temperature?: boolean;
  temperature_min_c?: number;
  temperature_max_c?: number; // >= min
  matiere_dangereuse?: boolean;
  adr_classe?: ADRClasse;
  adr_uno?: string; // N° ONU
}

/* ---------- STRUCTURE GLOBALE ---------- */

export interface MandatCreationData
  extends Step1General,
    Step2Adresses,
    Step3Horaires,
    Step4Marchandise {}
