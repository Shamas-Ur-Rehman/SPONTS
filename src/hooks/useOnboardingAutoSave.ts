import { useEffect, useCallback } from "react";
import { OnboardingFormData } from "@/types/onboarding";

/**
 * Hook pour la sauvegarde automatique des données d'onboarding
 * Sauvegarde les données dans localStorage et les restaure au chargement
 */
export function useOnboardingAutoSave(
  userRole: "expediteur" | "transporteur",
  userId: string | null,
  formData: OnboardingFormData,
  setFormData: (data: OnboardingFormData) => void
) {
  // Clé unique pour chaque utilisateur et rôle
  const storageKey = `onboarding-${userRole}-${userId}`;

  /**
   * @param Sauvegarde des données dans localStorage
   *
   * Sauvegarde automatique des données à chaque modification
   */
  const saveToStorage = useCallback(
    (data: OnboardingFormData) => {
      if (!userId) return;

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
            version: "1.0",
          })
        );
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde des données d'onboarding:",
          error
        );
      }
    },
    [userId, storageKey]
  );

  /**
   * @param Restauration des données depuis localStorage
   *
   * Charge les données sauvegardées au montage du composant
   */
  const loadFromStorage = useCallback(() => {
    if (!userId) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Vérifier que les données ne sont pas trop anciennes (24h max)
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;

        if (isRecent && parsed.data) {
          setFormData(parsed.data);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la restauration des données d'onboarding:",
        error
      );
      // Supprimer les données corrompues
      localStorage.removeItem(storageKey);
    }
  }, [userId, storageKey, setFormData]);

  /**
   * @param Nettoyage des données sauvegardées
   *
   * Supprime les données d'onboarding du localStorage
   */
  const clearSavedData = useCallback(() => {
    if (!userId) return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(
        "Erreur lors du nettoyage des données d'onboarding:",
        error
      );
    }
  }, [userId, storageKey]);

  // Charger les données au montage
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Sauvegarder à chaque modification des données
  useEffect(() => {
    // Éviter de sauvegarder des données vides au premier rendu
    const hasData = Object.values(formData).some((value) => {
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "object" && value !== null) {
        return Object.values(value).some((v) =>
          typeof v === "string" ? v.trim() !== "" : v !== undefined
        );
      }
      return false;
    });

    if (hasData) {
      saveToStorage(formData);
    }
  }, [formData, saveToStorage]);

  return {
    clearSavedData,
    saveToStorage,
    loadFromStorage,
  };
}
