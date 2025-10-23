"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useOnboardingAutoSave } from "@/hooks/useOnboardingAutoSave";
import { useOnboardingCleanup } from "@/hooks/useOnboardingCleanup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressInput } from "@/components/pages/mandats/address-input/address-input";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { OnboardingFormData } from "@/types/onboarding";
import { useAuth } from "@/hooks/useAuth";

export default function TransporteurOnboarding() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    raisonSociale: "",
    numeroRCS: "",
    numeroTVA: "",
    representantNom: "",
    representantPrenom: "",
    emailContact: "",
    adresse: {
      adresse: "",
    },
    typeActivite: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Hook pour la sauvegarde automatique des données
  const { clearSavedData } = useOnboardingAutoSave(
    "transporteur",
    user?.id || null,
    formData,
    setFormData
  );

  // Hook pour le nettoyage lors de la sortie de page
  useOnboardingCleanup();

  /**
   * @param Vérification de l'accès à l'onboarding
   *
   * Redirige si l'utilisateur n'a pas de token temporaire ou si l'onboarding est déjà complété
   */
  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (authLoading) {
      return;
    }

    // Vérifier si l'utilisateur est connecté
    if (user) {
      if (user.user_data?.role !== "transporteur") {
        toast.error("Cette page est réservée aux transporteurs.");
        router.push("/register/transporteur");
        return;
      }

      // Onboarding considéré comme complété si l'utilisateur a une company avec des données complètes
      const hasCompletedOnboarding = Boolean(
        user.company &&
          user.company_membership &&
          user.company.name &&
          user.company.billing_address
      );

      if (hasCompletedOnboarding) {
        toast.info("Votre profil est déjà complété.");
        router.push("/transporteur");
        return;
      }
    } else {
      // Vérifier s'il y a un token temporaire en attente
      const tempToken = sessionStorage.getItem("tempToken");

      if (!tempToken) {
        // Si pas d'utilisateur et pas de token temporaire, rediriger vers inscription
        toast.error("Accès non autorisé. Veuillez vous inscrire d'abord.");
        router.push("/register/transporteur");
      }
      // Si il y a un token temporaire, on attend que TempAuthProvider l'authentifie
    }
  }, [user, authLoading, router]);

  /**
   * @param Toast de bienvenue au chargement de la page
   *
   * Informe l'utilisateur qu'il doit compléter son profil
   */
  useEffect(() => {
    if (user && !authLoading) {
      toast.info(
        "Bienvenue! Complétez votre profil pour profiter pleinement des fonctionnalités de l'application.",
        {
          duration: 5000,
        }
      );
    }
  }, [user, authLoading]);

  /**
   * @param Validation des champs du formulaire
   *
   * Vérifie que tous les champs requis sont remplis
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.raisonSociale.trim()) {
      newErrors.raisonSociale = "La raison sociale est requise";
    }
    if (!formData.numeroRCS.trim()) {
      newErrors.numeroRCS = "Le numéro RCS est requis";
    }
    if (!formData.numeroTVA.trim()) {
      newErrors.numeroTVA = "Le numéro de TVA est requis";
    }
    if (!formData.representantNom.trim()) {
      newErrors.representantNom = "Le nom du représentant est requis";
    }
    if (!formData.representantPrenom.trim()) {
      newErrors.representantPrenom = "Le prénom du représentant est requis";
    }
    if (!formData.emailContact.trim()) {
      newErrors.emailContact = "L'email de contact est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailContact)) {
      newErrors.emailContact = "L'email n'est pas valide";
    }
    if (!formData.adresse.adresse.trim()) {
      newErrors.adresse = "L'adresse est requise";
    } else if (!formData.adresse.lat || !formData.adresse.lng) {
      newErrors.adresse =
        "Veuillez sélectionner une adresse valide dans la liste des suggestions";
    }
    if (!formData.typeActivite?.trim()) {
      newErrors.typeActivite = "Le type d'activité est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * @param Soumission du formulaire d'onboarding
   *
   * Sauvegarde les données de société et finalise l'inscription
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    if (!user) {
      toast.error(
        "Erreur d'authentification. Veuillez vous connecter à nouveau."
      );
      router.push("/register/transporteur");
      return;
    }

    setLoading(true);

    try {
      // Préparer les données pour la sauvegarde
      const profileData = {
        raisonSociale: formData.raisonSociale.trim(),
        numeroRCS: formData.numeroRCS.trim(),
        numeroTVA: formData.numeroTVA.trim(),
        representant: {
          nom: formData.representantNom.trim(),
          prenom: formData.representantPrenom.trim(),
        },
        emailContact: formData.emailContact.trim(),
        adresse: {
          complete: formData.adresse.adresse,
          lat: formData.adresse.lat,
          lng: formData.adresse.lng,
        },
        typeActivite: formData.typeActivite?.trim(),
      };

      // Sauvegarder les données via l'API
      const response = await fetch("/api/auth/save-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken: user.id,
          profileData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la sauvegarde");
      }

      // Nettoyer le token temporaire après onboarding réussi
      sessionStorage.removeItem("tempToken");

      // Nettoyer les données sauvegardées d'onboarding
      clearSavedData();

      // Recharger l'utilisateur avec les nouvelles données
      if (window.location) {
        window.location.href = "/expediteur";
      } else {
        toast.success(
          "Profil complété avec succès ! Vous allez être redirigé vers votre tableau de bord."
        );
        router.push("/expediteur");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde du profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <span
              className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
              aria-label="Chargement"
            />
            <div className="text-lg">Chargement de votre profil...</div>
          </div>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="text-lg">Vérification de l&apos;accès...</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <div className="space-y-4 px-4">
              {/* Bouton retour */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/")}
                className="flex items-left space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour à l&apos;accueil</span>
              </Button>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Complétez votre profil transporteur
              </CardTitle>
              <CardDescription>
                Ces informations sont nécessaires pour utiliser la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations de l'entreprise */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Informations de l&apos;entreprise
                  </h3>

                  <div>
                    <Label htmlFor="raisonSociale" className="pb-2">
                      Raison sociale
                    </Label>
                    <Input
                      id="raisonSociale"
                      value={formData.raisonSociale}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          raisonSociale: e.target.value,
                        }))
                      }
                      className={errors.raisonSociale ? "border-red-500" : ""}
                    />
                    {errors.raisonSociale && (
                      <span className="text-sm text-red-500">
                        {errors.raisonSociale}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numeroRCS" className="pb-2">
                        Numéro RCS
                      </Label>
                      <Input
                        id="numeroRCS"
                        value={formData.numeroRCS}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            numeroRCS: e.target.value,
                          }))
                        }
                        className={errors.numeroRCS ? "border-red-500" : ""}
                      />
                      {errors.numeroRCS && (
                        <span className="text-sm text-red-500">
                          {errors.numeroRCS}
                        </span>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="numeroTVA" className="pb-2">
                        Numéro de TVA
                      </Label>
                      <Input
                        id="numeroTVA"
                        value={formData.numeroTVA}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            numeroTVA: e.target.value,
                          }))
                        }
                        className={errors.numeroTVA ? "border-red-500" : ""}
                      />
                      {errors.numeroTVA && (
                        <span className="text-sm text-red-500">
                          {errors.numeroTVA}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="typeActivite" className="pb-2">
                      Type d&apos;activité
                    </Label>
                    <Input
                      id="typeActivite"
                      value={formData.typeActivite || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          typeActivite: e.target.value,
                        }))
                      }
                      className={errors.typeActivite ? "border-red-500" : ""}
                      placeholder="Ex: Transport routier, Logistique, Messagerie..."
                    />
                    {errors.typeActivite && (
                      <span className="text-sm text-red-500">
                        {errors.typeActivite}
                      </span>
                    )}
                  </div>
                </div>

                {/* Informations du représentant */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Informations du représentant
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="representantNom" className="pb-2">
                        Nom du représentant
                      </Label>
                      <Input
                        id="representantNom"
                        value={formData.representantNom}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            representantNom: e.target.value,
                          }))
                        }
                        className={
                          errors.representantNom ? "border-red-500" : ""
                        }
                      />
                      {errors.representantNom && (
                        <span className="text-sm text-red-500">
                          {errors.representantNom}
                        </span>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="representantPrenom" className="pb-2">
                        Prénom du représentant
                      </Label>
                      <Input
                        id="representantPrenom"
                        value={formData.representantPrenom}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            representantPrenom: e.target.value,
                          }))
                        }
                        className={
                          errors.representantPrenom ? "border-red-500" : ""
                        }
                      />
                      {errors.representantPrenom && (
                        <span className="text-sm text-red-500">
                          {errors.representantPrenom}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="emailContact" className="pb-2">
                      Email de contact
                    </Label>
                    <Input
                      id="emailContact"
                      type="email"
                      value={formData.emailContact}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          emailContact: e.target.value,
                        }))
                      }
                      className={errors.emailContact ? "border-red-500" : ""}
                    />
                    {errors.emailContact && (
                      <span className="text-sm text-red-500">
                        {errors.emailContact}
                      </span>
                    )}
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Adresse</h3>
                  <AddressInput
                    placeholder="Recherchez votre adresse"
                    value={formData.adresse}
                    onChange={(adresse) =>
                      setFormData((prev) => ({ ...prev, adresse }))
                    }
                    className={errors.adresse ? "border-red-500" : ""}
                    showMap={false}
                  />
                  {errors.adresse && (
                    <span className="text-sm text-red-500">
                      {errors.adresse}
                    </span>
                  )}
                </div>

                {/* Bouton de soumission */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde en cours...
                      </>
                    ) : (
                      "Sauvegarder le profil"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
