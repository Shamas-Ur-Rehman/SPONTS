"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  RefreshCw,
  Trash2,
  Clock as ClockIcon,
  XCircle,
  Search,
  ChevronLeft,
  Eye,
  Edit,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageUploadZone } from "./image-upload/image-upload-zone";
import { AddressInput } from "./address-input/address-input";
import { DateTimeInput } from "./date-time-input";
import { FormStepper, Step } from "@/components/forms/FormStepper";
import {
  ChevronRight,
  FileText,
  MapPin,
  Clock,
  Package,
  ClipboardCheck,
  DollarSign,
  PenTool,
  HelpCircle,
} from "lucide-react";
import {
  MandatCreationData,
  Step1General,
  TypeAcces,
  TypeMarchandise,
  TypeVehicule,
  MoyenChargement,
} from "@/types/mandat-form";
import { useMandats } from "@/hooks/useMandats";
import { calculateQuote, Variables, Supplement } from "@/lib/quote";

const avatarSrc: string = (() => {
  // If the user object provides a string avatar url, use it.
  // if (typeof user?.avatar_url === "string" && user.avatar_url.length > 0) {
  //   return user.avatar_url;
  // }
  // fallback to a public Google-hosted placeholder image for now
  return "https://www.gstatic.com/images/branding/product/1x/avatar_circle_grey_512dp.png";
})();
const PUBLIC_GMAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export function CreateMandatWizard() {
  const router = useRouter();
  const { createMandat } = useMandats();

  const [activeStep, setActiveStep] = useState(0);
  const [addressSubStep, setAddressSubStep] = useState(0); // 0 = enlèvement, 1 = livraison
  const [merchandiseSubStep, setMerchandiseSubStep] = useState(0); // 0 = détails, 1 = état
  const [data, setData] = useState<MandatCreationData>({
    // Étape 1
    nom: "",
    description: "",
    images: [],
    // Étape 2 (placeholder initial)
    depart_adresse: { adresse: "", lat: 0, lng: 0 },
    arrivee_adresse: { adresse: "", lat: 0, lng: 0 },
    depart_contact: "",
    arrivee_contact: "",
    depart_horaires_ouverture: "",
    arrivee_horaires_ouverture: "",
    // Nouveaux champs pour les adresses détaillées
    depart_pays: "CH",
    depart_canton: "",
    depart_ville: "",
    depart_code_postal: "",
    depart_telephone: "",
    arrivee_pays: "CH",
    arrivee_canton: "",
    arrivee_ville: "",
    arrivee_code_postal: "",
    arrivee_telephone: "",
    // Étape 3
    enlevement_souhaite_debut_at: "",
    enlevement_souhaite_fin_at: "",
    enlevement_max_at: "",
    livraison_prevue_debut_at: "",
    livraison_prevue_fin_at: "",
    // Étape 4 – valeurs par défaut pour garantir un calcul de devis
    poids_total_kg: 100, // 100kg par défaut
    volume_total_m3: 1, // 1m³ par défaut
    surface_m2: 1, // 1m² par défaut (minimum pour calcul)
    nombre_colis: 1, // 1 colis par défaut
    sensi_temperature: false,
    matiere_dangereuse: false,
  } as MandatCreationData);

  // Données statiques de pricing pour éviter les erreurs de chargement
  const staticPricingData = useMemo(
    () => ({
      id: "static-pricing",
      name: "Pricing par défaut",
      variables: {
        tarif_km_base_chf: 0.85, // 0.85 CHF par km par m²
        maj_carburant_pct: 15, // 15% majoration carburant
        maj_embouteillage_pct: 5, // 5% majoration embouteillage
        tva_rate_pct: 7.7, // 7.7% TVA suisse
      },
      supplements: [
        {
          nom: "Surcharge grue",
          type: "pct" as const,
          montant: 20, // 20% si grue nécessaire
        },
      ],
    }),
    []
  );

  const [pricing, setPricing] = useState<any | null>(staticPricingData);
  const [quote, setQuote] = useState<any | null>(null);
  const [signatureOk, setSignatureOk] = useState(false);

  // Charger le pricing actif une seule fois (avec fallback sur données statiques)
  useEffect(() => {
    fetch("/api/admin/pricing?active=1")
      .then((r) => r.json())
      .then((json) => {
        console.log("[Wizard] Pricing actif chargé", json.data?.pricings?.[0]);
        const loadedPricing = json.data?.pricings?.[0];
        if (loadedPricing && loadedPricing.variables) {
          setPricing(loadedPricing);
        } else {
          console.log("[Wizard] Utilisation du pricing statique par défaut");
          setPricing(staticPricingData);
        }
      })
      .catch((error) => {
        console.error(
          "[Wizard] Erreur chargement pricing, utilisation données statiques:",
          error
        );
        setPricing(staticPricingData);
      });
  }, [staticPricingData]);

  // Recalcul du devis (toujours avec des données valides)
  useEffect(() => {
    console.log("🧮 [Wizard] Conditions pour calcul devis:", {
      pricing: !!pricing,
      surface_m2: data.surface_m2,
      distance_km: data.distance_km,
      variables: !!pricing?.variables,
    });

    // Calcul avec données par défaut pour garantir toujours un devis
    const surfaceToUse = Math.max(data.surface_m2 || 1, 0.1); // Minimum 0.1m² pour éviter prix à 0
    const distanceToUse = Math.max(data.distance_km || 10, 1); // Distance par défaut de 10km, minimum 1km

    if (pricing && pricing.variables) {
      const q = calculateQuote(
        distanceToUse,
        surfaceToUse,
        pricing.variables as Variables,
        (pricing.supplements || []) as Supplement[]
      );
      console.log("[Wizard] Devis calculé:", q);
      setQuote(q);
    } else {
      console.log("❌ [Wizard] Pas de données de pricing disponibles");
      // Calcul de secours avec données statiques
      const fallbackQuote = calculateQuote(
        distanceToUse,
        surfaceToUse,
        staticPricingData.variables as Variables,
        staticPricingData.supplements as Supplement[]
      );
      console.log("[Wizard] Devis de secours:", fallbackQuote);
      setQuote(fallbackQuote);
    }
  }, [
    pricing,
    data.distance_km,
    data.surface_m2,
    staticPricingData.variables,
    staticPricingData.supplements,
  ]);

  // Forcer le calcul initial du devis au chargement
  useEffect(() => {
    if (!quote && pricing && pricing.variables) {
      console.log("🚀 [Wizard] Calcul initial du devis forcé");
      const initialQuote = calculateQuote(
        10, // 10km par défaut
        1, // 1m² par défaut
        pricing.variables as Variables,
        (pricing.supplements || []) as Supplement[]
      );
      setQuote(initialQuote);
    }
  }, [pricing, quote]);

  // Calculer distance en client dès que les deux adresses ont lat/lng
  useEffect(() => {
    const d = data.depart_adresse as any;
    const a = data.arrivee_adresse as any;
    if (
      d?.lat &&
      d?.lng &&
      a?.lat &&
      a?.lng &&
      !data.distance_km &&
      PUBLIC_GMAP_KEY
    ) {
      const url = `/api/maps/distance?origins=${d.lat},${d.lng}&destinations=${a.lat},${a.lng}`;
      console.log("[Wizard] DistanceMatrix URL", url);
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          console.log("[Wizard] DistanceMatrix response", json);
          if (
            json.status === "OK" &&
            json.rows?.[0]?.elements?.[0]?.status === "OK"
          ) {
            const km = json.rows[0].elements[0].distance.value / 1000;
            setData((p) => ({ ...p, distance_km: km }));
            console.log("[Wizard] Distance Matrix km", km);
          }
        })
        .catch((e) => console.error("DistanceMatrix error", e));
    }
  }, [data.depart_adresse, data.arrivee_adresse, data.distance_km]);

  // Reset sub-steps when changing main steps
  useEffect(() => {
    if (activeStep !== 1) {
      setAddressSubStep(0);
    }
    if (activeStep !== 3) {
      setMerchandiseSubStep(0);
    }
  }, [activeStep]);

  /* ---------------- Etape 1 UI ---------------- */
  const Step1 = (goNext: () => void) => {
    const handleChange = <K extends keyof Step1General>(
      field: K,
      value: Step1General[K]
    ) => {
      setData((prev) => ({ ...prev, [field]: value }));
    };

    const isValid =
      data.nom.trim().length > 0 && data.description.trim().length >= 10;

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Créez un mandat</h2>
          <p className="text-muted-foreground">
            Commencez par les informations principales.
          </p>
        </div>

        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="nom" className="text-sm font-medium">
            Nom du mandat *
          </Label>
          <Input
            id="nom"
            value={data.nom}
            maxLength={120}
            placeholder="Titre court (ex: Livraison palettes Lausanne)"
            onChange={(e) => handleChange("nom", e.target.value)}
            required
            className="h-10 text-[#6A7282] bg-[#F9FAFB] border-[#E5E7EB]"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description *
          </Label>
          <Textarea
            id="description"
            value={data.description}
            minLength={10}
            rows={4}
            placeholder="Décrivez la marchandise et les besoins spécifiques"
            onChange={(e) => handleChange("description", e.target.value)}
            required
            className="resize-none text-[#6A7282] bg-[#F9FAFB] border-[#E5E7EB]"
          />
          <p className="text-xs text-muted-foreground">
            {data.description.trim().length}/10 caractères minimum
          </p>
        </div>

        {/* Images */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ajouter des photos</Label>
          <ImageUploadZone
            currentImages={data.images}
            onImagesChange={(imgs) => handleChange("images", imgs)}
          />
        </div>

        {/* Navigation custom */}
        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={goNext} disabled>
            ← Retour
          </Button>
          <Button onClick={goNext} disabled={!isValid}>
            Continuer →
          </Button>
        </div>
      </div>
    );
  };

  /* ---------------- Composants Adresses ---------------- */
  const countries = [
    { value: "CH", label: "Suisse" },
    { value: "FR", label: "France" },
    { value: "DE", label: "Allemagne" },
    { value: "IT", label: "Italie" },
    { value: "AT", label: "Autriche" },
  ];

  // Fonction pour extraire les données de l'adresse Google Maps
  const extractAddressComponents = (
    addressData: any
  ): {
    country: string;
    canton: string;
    ville: string;
    codePostal: string;
  } => {
    console.log("🔍 [extractAddressComponents] Données reçues:", addressData);

    if (!addressData || !addressData.address_components) {
      console.log("❌ [extractAddressComponents] Pas de address_components");
      return { country: "", canton: "", ville: "", codePostal: "" };
    }

    const components = addressData.address_components;
    let country = "",
      canton = "",
      ville = "",
      codePostal = "";

    components.forEach((component: any) => {
      const types = component.types;
      console.log(
        `🏷️ [extractAddressComponents] Component:`,
        component.long_name,
        "Types:",
        types
      );

      if (types.includes("country")) {
        country = component.short_name;
      }
      if (types.includes("administrative_area_level_1")) {
        canton = component.long_name;
      }
      if (
        types.includes("locality") ||
        types.includes("administrative_area_level_2")
      ) {
        ville = component.long_name;
      }
      if (types.includes("postal_code")) {
        codePostal = component.long_name;
      }
    });

    const result = { country, canton, ville, codePostal };
    console.log("✅ [extractAddressComponents] Résultat:", result);
    return result;
  };

  const AddressEnlevementForm = (goNext: () => void, goBack: () => void) => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Adresse d'enlèvement</h2>
        <p className="text-muted-foreground">
          Indiquez où le transporteur doit venir chercher la marchandise.
        </p>
      </div>

      <div className="space-y-6">
        {/* Adresse complète */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Adresse complète *</Label>
          <AddressInput
            value={data.depart_adresse}
            placeholder="Entrez adresse"
            onChange={(val) => {
              setData((p) => ({ ...p, depart_adresse: val as any }));

              // Extraire les composants de l'adresse si disponibles
              if (val && (val as any).details) {
                const components = extractAddressComponents(
                  (val as any).details
                );
                setData((p) => ({
                  ...p,
                  depart_pays: components.country || p.depart_pays,
                  depart_canton: components.canton || "",
                  depart_ville: components.ville || "",
                  depart_code_postal: components.codePostal || "",
                }));
              }
            }}
          />
        </div>

        {/* Pays et Canton/région */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pays *</Label>
            <Select
              value={data.depart_pays}
              onValueChange={(value) =>
                setData((p) => ({ ...p, depart_pays: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre pays" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Canton / région *</Label>
            <Input
              value={data.depart_canton}
              placeholder="Sélectionnez votre canton / région"
              onChange={(e) =>
                setData((p) => ({ ...p, depart_canton: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Ville et Code postal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Votre ville *</Label>
            <Input
              value={data.depart_ville}
              placeholder="Sélectionnez la ville"
              onChange={(e) =>
                setData((p) => ({ ...p, depart_ville: e.target.value }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Code postal *</Label>
            <Input
              value={data.depart_code_postal}
              placeholder="Entrez le code postal"
              onChange={(e) =>
                setData((p) => ({ ...p, depart_code_postal: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nom du contact *</Label>
            <Input
              value={data.depart_contact ?? ""}
              placeholder="Personne à contacter sur place"
              onChange={(e) =>
                setData((p) => ({ ...p, depart_contact: e.target.value }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Téléphone du contact *
            </Label>
            <Input
              value={data.depart_telephone}
              placeholder="Numéro de contact direct"
              onChange={(e) =>
                setData((p) => ({ ...p, depart_telephone: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Horaires d'ouverture */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Horaires d'ouverture</Label>
          <Textarea
            value={data.depart_horaires_ouverture ?? ""}
            placeholder="Ex : Lun–Ven 08:00–12:00 / 13:30–17:00"
            rows={2}
            onChange={(e) =>
              setData((p) => ({
                ...p,
                depart_horaires_ouverture: e.target.value,
              }))
            }
            className="resize-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={goBack}>
          ← Retour
        </Button>
        <Button
          onClick={() => setAddressSubStep(1)}
          disabled={!data.depart_adresse.adresse.trim()}
        >
          Continuer →
        </Button>
      </div>
    </div>
  );

  const AddressLivraisonForm = (goNext: () => void) => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Adresse de livraison</h2>
        <p className="text-muted-foreground">
          Indiquez où la marchandise doit être livrée.
        </p>
      </div>

      <div className="space-y-6">
        {/* Adresse complète */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Adresse complète *</Label>
          <AddressInput
            value={data.arrivee_adresse}
            placeholder="Entrez adresse"
            onChange={(val) => {
              setData((p) => ({ ...p, arrivee_adresse: val as any }));

              // Extraire les composants de l'adresse si disponibles
              if (val && (val as any).details) {
                const components = extractAddressComponents(
                  (val as any).details
                );
                setData((p) => ({
                  ...p,
                  arrivee_pays: components.country || p.arrivee_pays,
                  arrivee_canton: components.canton || "",
                  arrivee_ville: components.ville || "",
                  arrivee_code_postal: components.codePostal || "",
                }));
              }
            }}
          />
        </div>

        {/* Pays et Canton/région */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pays *</Label>
            <Select
              value={data.arrivee_pays}
              onValueChange={(value) =>
                setData((p) => ({ ...p, arrivee_pays: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre pays" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">État/province *</Label>
            <Input
              value={data.arrivee_canton}
              placeholder="Sélectionnez le canton / région"
              onChange={(e) =>
                setData((p) => ({ ...p, arrivee_canton: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Ville et Code postal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Votre ville *</Label>
            <Input
              value={data.arrivee_ville}
              placeholder="Sélectionnez la ville"
              onChange={(e) =>
                setData((p) => ({ ...p, arrivee_ville: e.target.value }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Code postal *</Label>
            <Input
              value={data.arrivee_code_postal}
              placeholder="Entrez le code postal"
              onChange={(e) =>
                setData((p) => ({ ...p, arrivee_code_postal: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nom du contact *</Label>
            <Input
              value={data.arrivee_contact ?? ""}
              placeholder="Personne à contacter sur place"
              onChange={(e) =>
                setData((p) => ({ ...p, arrivee_contact: e.target.value }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Téléphone du contact *
            </Label>
            <Input
              value={data.arrivee_telephone}
              placeholder="Numéro de contact direct"
              onChange={(e) =>
                setData((p) => ({ ...p, arrivee_telephone: e.target.value }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Horaires d'ouverture */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Horaires d'ouverture</Label>
          <Textarea
            value={data.arrivee_horaires_ouverture ?? ""}
            placeholder="Ex : Lun–Ven 08:00–12:00 / 13:30–17:00"
            rows={2}
            onChange={(e) =>
              setData((p) => ({
                ...p,
                arrivee_horaires_ouverture: e.target.value,
              }))
            }
            className="resize-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={() => setAddressSubStep(0)}>
          ← Retour
        </Button>
        <Button
          onClick={goNext}
          disabled={!data.arrivee_adresse.adresse.trim()}
        >
          Continuer →
        </Button>
      </div>
    </div>
  );

  /* ---------------- Composants Marchandise ---------------- */
  const MarchandiseDetailsForm = (goNext: () => void, goBack: () => void) => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Détails de la marchandise</h2>
        <p className="text-muted-foreground">
          Précisez ce que vous souhaitez transporter pour obtenir une estimation
          juste.
        </p>
      </div>

      <div className="space-y-6">
        {/* Type de marchandise */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type de marchandise *</Label>
          <Select
            value={data.type_marchandise ?? ""}
            onValueChange={(value) =>
              setData((p) => ({
                ...p,
                type_marchandise: value as TypeMarchandise,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez le type de marchandise" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TypeMarchandise).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Poids et Volume */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Poids total (kg) *</Label>
            <Input
              type="number"
              min="0.1"
              step="0.01"
              value={data.poids_total_kg}
              placeholder="Min 0.1"
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  poids_total_kg: Number(e.target.value),
                }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Volume total (m³) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={data.volume_total_m3}
              placeholder="Min 0.01"
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  volume_total_m3: Number(e.target.value),
                }))
              }
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Surface (m²) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={data.surface_m2}
              placeholder="Min 0.01"
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  surface_m2: Number(e.target.value),
                }))
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Nombre de colis */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nombre de colis</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={data.nombre_colis ?? 0}
            placeholder="Indiquez le nombre total de colis"
            onChange={(e) =>
              setData((p) => ({
                ...p,
                nombre_colis: Number(e.target.value),
              }))
            }
            className="h-10"
          />
        </div>

        {/* Type de véhicule requis */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Type de véhicule requis *
          </Label>
          <Select
            value={data.type_vehicule ?? ""}
            onValueChange={(value) =>
              setData((p) => ({
                ...p,
                type_vehicule: value as TypeVehicule,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez le véhicule adapté" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TypeVehicule).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accès au site */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Accès au site *</Label>
          <Select
            value={data.type_acces ?? ""}
            onValueChange={(value) =>
              setData((p) => ({
                ...p,
                type_acces: value as TypeAcces,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez les conditions d'accès" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TypeAcces).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Moyen de chargement */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Moyen de chargement *</Label>
          <Select
            value={data.moyen_chargement ?? ""}
            onValueChange={(value) =>
              setData((p) => ({
                ...p,
                moyen_chargement: value as MoyenChargement,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez le mode de chargement" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MoyenChargement).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Préciser l'accès si "autre" */}
        {data.type_acces === TypeAcces.Autre && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Précisez l'accès (si "autre") *
            </Label>
            <Textarea
              value={data.acces_autre ?? ""}
              placeholder="Décrivez les contraintes spécifiques"
              rows={3}
              onChange={(e) =>
                setData((p) => ({ ...p, acces_autre: e.target.value }))
              }
              className="resize-none"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={goBack}>
          ← Retour
        </Button>
        <Button
          onClick={() => setMerchandiseSubStep(1)}
          disabled={data.poids_total_kg < 0.1}
        >
          Continuer →
        </Button>
      </div>
    </div>
  );

  // Composant Toggle Switch
  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-primary" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  const MarchandiseEtatForm = (goNext: () => void) => (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">État de la marchandise</h2>
          <p className="text-muted-foreground">
            Indiquez si votre marchandise présente des conditions particulières
            de transport.
          </p>
        </div>

        <div className="space-y-6">
          {/* Sensibilité à la température */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={data.sensi_temperature ?? false}
                onChange={(checked) =>
                  setData((p) => ({
                    ...p,
                    sensi_temperature: checked,
                  }))
                }
              />
              <Label
                htmlFor="sensi_temperature"
                className="text-sm font-medium cursor-pointer"
              >
                Sensibilité à la température
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nécessite un transport réfrigéré ou chauffé</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {data.sensi_temperature && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Température min (°C) *
                    </Label>
                    <Input
                      type="number"
                      placeholder="Entrez température min"
                      value={data.temperature_min_c ?? ""}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          temperature_min_c: Number(e.target.value),
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Température max (°C) *
                    </Label>
                    <Input
                      type="number"
                      placeholder="Entrez température max"
                      value={data.temperature_max_c ?? ""}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          temperature_max_c: Number(e.target.value),
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Marchandise dangereuse */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={data.matiere_dangereuse ?? false}
                onChange={(checked) =>
                  setData((p) => ({
                    ...p,
                    matiere_dangereuse: checked,
                  }))
                }
              />
              <Label
                htmlFor="matiere_dangereuse"
                className="text-sm font-medium cursor-pointer"
              >
                Marchandise dangereuse (ADR)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Contient des matières ou produits soumis à la réglementation
                    ADR
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {data.matiere_dangereuse && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Classe ADR *</Label>
                    <Select
                      value={data.adr_classe?.toString() ?? ""}
                      onValueChange={(value) =>
                        setData((p) => ({
                          ...p,
                          adr_classe: Number(value) as any,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            Classe {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">N° ONU *</Label>
                    <Input
                      placeholder="1234"
                      value={data.adr_uno ?? ""}
                      onChange={(e) =>
                        setData((p) => ({ ...p, adr_uno: e.target.value }))
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={() => setMerchandiseSubStep(0)}>
            ← Retour
          </Button>
          <Button onClick={goNext}>Continuer →</Button>
        </div>
      </div>
    </TooltipProvider>
  );

  /* ---------------- Steps Array ---------------- */
  const stepIcons = [
    FileText,
    MapPin,
    Clock,
    Package,
    ClipboardCheck,
    DollarSign,
    PenTool,
  ];

  const steps: Step[] = [
    {
      label: "Créer un mandat",
      description: "Informations principales du mandat",
      content: (next) => Step1(next),
      isValid: () =>
        data.nom.trim().length > 0 && data.description.trim().length >= 10,
    },
    {
      label: "Adresse",
      description: "Points de départ et d'arrivée",
      content: (next, back) => {
        if (addressSubStep === 0) {
          return AddressEnlevementForm(() => {
            // When continuing from enlèvement, go to livraison
            setAddressSubStep(1);
          }, back);
        } else {
          return AddressLivraisonForm(() => {
            // When continuing from livraison, go to next main step
            setAddressSubStep(0); // Reset for next time
            next();
          });
        }
      },
      isValid: () =>
        data.depart_adresse.adresse.trim().length > 0 &&
        data.arrivee_adresse.adresse.trim().length > 0,
    },
    {
      label: "Date du transport",
      description: "Dates et heures d'enlèvement et livraison",
      content: (next, back) => (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dates du transport</h2>
            <p className="text-muted-foreground">
              Indiquez les périodes souhaitées pour l'enlèvement et la
              livraison.
            </p>
          </div>

          {/* Enlèvement souhaité */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enlèvement souhaité</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Enlèvement souhaité — début *
                </Label>
                <DateTimeInput
                  value={data.enlevement_souhaite_debut_at}
                  onChange={(val) =>
                    setData((p) => ({
                      ...p,
                      enlevement_souhaite_debut_at: val,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Sélectionnez la date de départ souhaitée
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Enlèvement souhaité — fin *
                </Label>
                <DateTimeInput
                  value={data.enlevement_souhaite_fin_at}
                  onChange={(val) =>
                    setData((p) => ({ ...p, enlevement_souhaite_fin_at: val }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Jusqu'à quelle date cela peut avoir lieu
                </p>
              </div>
            </div>
          </div>

          {/* Deadline max enlèvement */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deadline max enlèvement</h3>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Deadline max enlèvement
              </Label>
              <DateTimeInput
                value={data.enlevement_max_at || ""}
                onChange={(val) =>
                  setData((p) => ({
                    ...p,
                    enlevement_max_at: val,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Dernier jour possible pour le retrait
              </p>
            </div>
          </div>

          {/* Livraison prévue */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Livraison prévue</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Livraison prévue — début *
                </Label>
                <DateTimeInput
                  value={data.livraison_prevue_debut_at || ""}
                  onChange={(val) =>
                    setData((p) => ({
                      ...p,
                      livraison_prevue_debut_at: val,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Date prévue de livraison
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Livraison prévue — fin *
                </Label>
                <DateTimeInput
                  value={data.livraison_prevue_fin_at || ""}
                  onChange={(val) =>
                    setData((p) => ({
                      ...p,
                      livraison_prevue_fin_at: val,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Dernier jour possible pour la livraison
                </p>
              </div>
            </div>
          </div>

          {/* Message d'information */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800 flex items-start gap-2">
              <span className="text-blue-600">ℹ️</span>
              Les horaires exacts pourront être confirmés avec le transporteur
              après la mise en relation.*
            </p>
          </div>

          {/* Validation des dates */}
          {data.enlevement_souhaite_debut_at &&
            data.enlevement_souhaite_fin_at &&
            new Date(data.enlevement_souhaite_debut_at) >=
              new Date(data.enlevement_souhaite_fin_at) && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                La date de fin d'enlèvement doit être postérieure à la date de
                début
              </div>
            )}

          {data.livraison_prevue_debut_at &&
            data.livraison_prevue_fin_at &&
            new Date(data.livraison_prevue_debut_at) >=
              new Date(data.livraison_prevue_fin_at) && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                La date de fin de livraison doit être postérieure à la date de
                début
              </div>
            )}

          <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="outline" onClick={back} size="lg">
              ← Retour
            </Button>
            <Button
              onClick={next}
              disabled={
                !data.enlevement_souhaite_debut_at ||
                !data.enlevement_souhaite_fin_at ||
                new Date(data.enlevement_souhaite_debut_at) >=
                  new Date(data.enlevement_souhaite_fin_at)
              }
              size="lg"
            >
              Continuer →
            </Button>
          </div>
        </div>
      ),
      isValid: () =>
        Boolean(data.enlevement_souhaite_debut_at) &&
        Boolean(data.enlevement_souhaite_fin_at) &&
        new Date(data.enlevement_souhaite_debut_at) <
          new Date(data.enlevement_souhaite_fin_at),
    },
    {
      label: "Détails de la marchandise",
      description: "Détails et caractéristiques",
      content: (next, back) => {
        if (merchandiseSubStep === 0) {
          return MarchandiseDetailsForm(() => {
            // When continuing from détails, go to état
            setMerchandiseSubStep(1);
          }, back);
        } else {
          return MarchandiseEtatForm(() => {
            // When continuing from état, go to next main step
            setMerchandiseSubStep(0); // Reset for next time
            next();
          });
        }
      },
      isValid: () => data.poids_total_kg >= 0.1,
    },
  ];

  // Inject new steps after ceux existants
  steps.push(
    {
      label: "Proposition tarifaire",
      description: "Vérifiez vos informations",
      content: (next, back) => (
        <div className="space-y-8">
          <div className="p-6 rounded-lg border bg-card space-y-6">
            <h3 className="text-lg font-semibold">Résumé de votre mandat</h3>

            <div className="space-y-4 divide-y">
              {/* Général */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Informations générales
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nom :</span>
                  <span className="font-medium">{data.nom}</span>
                  <span className="text-muted-foreground">Description :</span>
                  <span className="font-medium">{data.description}</span>
                  {data.images && data.images.length > 0 && (
                    <>
                      <span className="text-muted-foreground">Photos :</span>
                      <span className="font-medium">
                        {data.images.length} photo(s)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Adresses */}
              <div className="space-y-2 pt-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Itinéraire
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Départ :</span>
                  <span className="font-medium">
                    {data.depart_adresse.adresse}
                  </span>
                  <span className="text-muted-foreground">Arrivée :</span>
                  <span className="font-medium">
                    {data.arrivee_adresse.adresse}
                  </span>
                  {data.distance_km && (
                    <>
                      <span className="text-muted-foreground">Distance :</span>
                      <span className="font-medium">
                        {data.distance_km.toFixed(1)} km
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Horaires */}
              <div className="space-y-2 pt-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Horaires
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Début :</span>
                  <span className="font-medium">
                    {new Date(data.enlevement_souhaite_debut_at).toLocaleString(
                      "fr-FR"
                    )}
                  </span>
                  <span className="text-muted-foreground">Fin :</span>
                  <span className="font-medium">
                    {new Date(data.enlevement_souhaite_fin_at).toLocaleString(
                      "fr-FR"
                    )}
                  </span>
                </div>
              </div>

              {/* Marchandise */}
              <div className="space-y-2 pt-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Marchandise
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Poids :</span>
                  <span className="font-medium">{data.poids_total_kg} kg</span>
                  <span className="text-muted-foreground">Surface :</span>
                  <span className="font-medium">{data.surface_m2} m²</span>
                  {data.nombre_colis && data.nombre_colis > 0 && (
                    <>
                      <span className="text-muted-foreground">Colis :</span>
                      <span className="font-medium">{data.nombre_colis}</span>
                    </>
                  )}
                  {data.type_marchandise && (
                    <>
                      <span className="text-muted-foreground">Type :</span>
                      <span className="font-medium">
                        {data.type_marchandise}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="outline" onClick={back} size="lg">
              Retour
            </Button>
            <Button onClick={next} size="lg">
              Continuer vers le devis
            </Button>
          </div>
        </div>
      ),
      isValid: () => true,
    },
    {
      label: "Pièces jointes et remarques",
      description: "Estimation du coût",
      content: (next, back) => (
        <div className="space-y-8">
          {!quote ? (
            <div className="p-12 text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Calcul du devis en cours…</p>
            </div>
          ) : (
            <>
              <div className="p-6 rounded-lg border bg-card space-y-6">
                <h3 className="text-lg font-semibold">Estimation de prix</h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Prix de base HT
                    </span>
                    <span className="font-medium">
                      {quote.prixBaseHt.toFixed(2)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Coefficient de majoration
                    </span>
                    <span className="font-medium">
                      ×{quote.coeffMaj.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Après majoration %
                    </span>
                    <span className="font-medium">
                      {quote.prixApresPct.toFixed(2)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Après suppléments fixes
                    </span>
                    <span className="font-medium">
                      {quote.prixApresFixes.toFixed(2)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Après grue %</span>
                    <span className="font-medium">
                      {quote.prixApresGruePct.toFixed(2)} CHF
                    </span>
                  </div>

                  <div className="h-px bg-border my-4" />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total HT</span>
                    <span className="text-xl font-bold">
                      {quote.prixEstimeHt.toFixed(2)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">
                      Total TTC
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {quote.prixEstimeTtc.toFixed(2)} CHF
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  ℹ️ Ce devis est une estimation basée sur les informations
                  fournies. Le prix final pourra être ajusté par les
                  transporteurs en fonction des contraintes spécifiques.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="outline" onClick={back} size="lg">
              Retour
            </Button>
            <Button
              onClick={() => {
                if (quote) {
                  setData((p) => ({
                    ...p,
                    prix_estime_ht: quote.prixEstimeHt,
                    prix_estime_ttc: quote.prixEstimeTtc,
                  }));
                  next();
                }
              }}
              disabled={!quote}
              size="lg"
            >
              Accepter et continuer
            </Button>
          </div>
        </div>
      ),
      isValid: () => !!quote,
    },
    {
      label: "Signature du document",
      description: "Confirmez et publiez",
      content: (next, back) => (
        <div className="space-y-8">
          <div className="p-6 rounded-lg border bg-card space-y-6">
            <h3 className="text-lg font-semibold">Dernière étape</h3>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                En publiant ce mandat, vous acceptez que les transporteurs
                puissent le consulter et faire des offres. Vous serez notifié
                lorsqu'un transporteur manifestera son intérêt.
              </p>

              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5"
                    checked={signatureOk}
                    onChange={(e) => setSignatureOk(e.target.checked)}
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">
                      Je certifie l'exactitude des informations fournies
                    </span>
                    <p className="text-muted-foreground mt-1">
                      Les informations que j'ai fournies sont exactes et
                      complètes. Je comprends que toute information incorrecte
                      peut entraîner des complications lors du transport.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="outline" onClick={back} size="lg">
              Retour
            </Button>
            <Button
              onClick={next}
              disabled={!signatureOk}
              size="lg"
              className="min-w-[200px]"
            >
              Publier le mandat
            </Button>
          </div>
        </div>
      ),
      isValid: () => Boolean(signatureOk),
    }
  );

  /* ---------------- Soumission finale ---------------- */
  const handleSubmit = async () => {
    console.log("🚀 [handleSubmit] Début de la soumission du mandat");
    console.log("📋 [handleSubmit] Données à soumettre:", data);

    try {
      const mandat = await createMandat(data as any); // TODO: adapter API
      console.log("✅ [handleSubmit] Mandat créé:", mandat);

      if (mandat) {
        toast.success("Mandat créé avec succès !");
        router.push("/expediteur");
      }
    } catch (error) {
      console.error("❌ [handleSubmit] Erreur lors de la création:", error);
      toast.error("Erreur lors de la création du mandat");
    }
  };

  const current = steps[activeStep];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header breadcrumb */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-8 py-4 flex items-center justify-between">
          {/* Left Side: Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mes mandats</span>
            <ChevronRight size={16} />
            <span className="text-foreground font-medium">{current.label}</span>
            <ChevronRight size={16} />
          </div>

          {/* Right Side: Button + Avatar */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/expediteur/mandats/create")}
              size="sm"
              className="bg-[#0B69A3] text-white hover:bg-[#095d8b] rounded-md flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un nouveau mandat
            </Button>

            <div className="w-9 h-9 rounded-full overflow-hidden border">
              <img
                alt="avatar"
                src={avatarSrc}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal avec sidebar et formulaire */}
      <div className="flex flex-1 p-8 overflow-hidden">
        {/* Colonne latérale gauche fixe - Navigation des étapes */}
        <aside className="w-64 bg-[#F9FAFB] border-border p-[20px] flex flex-col overflow-auto rounded-lg">
          <div className="mb-6">
            <h1 className="text-lg font-semibold mb-1">Créer un mandat</h1>
            <p className="text-xs text-muted-foreground">
              Suivez les étapes pour publier votre demande de transport.
            </p>
          </div>

          {/* Liste des étapes verticale */}
          <nav className="flex-1 space-y-1">
            {steps.map((step, idx) => {
              const isActive = idx === activeStep;
              const isAccessible = idx <= activeStep;
              const StepIcon = stepIcons[idx];

              return (
                <button
                  key={step.label}
                  onClick={() => isAccessible && setActiveStep(idx)}
                  disabled={!isAccessible}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-md ${
                    isActive
                      ? "text-primary bg-primary/5"
                      : isAccessible
                      ? "text-foreground hover:bg-muted/50"
                      : "text-muted-foreground/50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <StepIcon
                      size={18}
                      className={isActive ? "text-primary" : ""}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">{step.label}</div>
                </button>
              );
            })}
          </nav>

          {/* Footer avec progression */}
          <div className="mt-auto pt-4">
            <div className="bg-[#0E406A] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">
                  {activeStep}/{steps.length} étape(s)
                </span>
                <span className="text-xs font-medium text-white">
                  {Math.round((activeStep / steps.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(activeStep / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Zone droite - Formulaire */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            <FormStepper
              steps={steps}
              onSubmit={handleSubmit}
              activeStep={activeStep}
              onStepChange={setActiveStep}
            />
          </div>
        </main>
      </div>

      {/*Footer collé en bas de la page */}
      <footer className="border-t border-border py-4 text-sm text-muted-foreground flex items-center justify-center gap-6">
        <p>© 2025 Revers0. Tous droits réservés.</p>
        <p>Mentions légales</p>
        <p>Support</p>
      </footer>
    </div>
  );
}
