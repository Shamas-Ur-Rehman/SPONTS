export interface OnboardingFormData {
  raisonSociale: string;
  numeroRCS: string;
  numeroTVA: string;
  representantNom: string;
  representantPrenom: string;
  emailContact: string;
  adresse: {
    adresse: string;
    lat?: number;
    lng?: number;
  };
  typeActivite?: string; // Uniquement pour les expéditeurs
}

export interface ProfileData {
  raisonSociale: string;
  numeroRCS: string;
  numeroTVA: string;
  representant: {
    nom: string;
    prenom: string;
  };
  emailContact: string;
  adresse: {
    complete: string;
    lat?: number;
    lng?: number;
  };
  typeActivite?: string;
  onboardingCompleted: boolean;
  completedAt?: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}