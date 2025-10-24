"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
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
          <h2 className="text-2xl font-bold mb-2 text-color :#111827">Créez un mandat</h2>
          <p style={{ color: '#6A7282' }}>
  Commencez par les informations principales.
</p>

        </div>

        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="nom" className="text-sm font-medium">
            Nom du mandat  <span style={{ color: '#C70036' }}>*</span>
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
            Description <span style={{ color: '#C70036' }}>*</span>
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
       <Button
  variant="outline"
  onClick={goNext}
  disabled
  className="bg-[#F3F4F6] text-[#64686e] border border-[#E5E7EB]"
>
  ← Retour
</Button>


      <Button
  onClick={goNext}
  disabled={!isValid}
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none"
>
  Continuer
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
          <Label className="text-sm font-medium">
  Adresse complète <span style={{ color: '#C70036' }}>*</span>
   
</Label>

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
            <Label className="text-sm font-medium">Pays <span style={{ color: '#C70036' }}>*</span></Label>
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
  <Label className="text-sm font-medium">
    Canton / région <span style={{ color: '#C70036' }}>*</span>
  </Label>
  <select
    value={data.depart_canton}
    onChange={(e) =>
      setData((p) => ({ ...p, depart_canton: e.target.value }))
    }
    className="h-10 w-full border border-gray-300 rounded-md px-2"
  >
    <option value="">Sélectionnez votre canton / région</option>
    <option value="Geneve">Genève</option>
    <option value="Vaud">Vaud</option>
    <option value="Zurich">Zurich</option>
    <option value="Bern">Bern</option>
    {/* Add more cantons/regions as needed */}
  </select>
</div>

        </div>

        {/* Ville et Code postal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
           <Label className="text-sm font-medium">
  Votre ville <span style={{ color: '#C70036' }}>*</span>
</Label>
<select
  value={data.depart_ville}
  onChange={(e) =>
    setData((p) => ({ ...p, depart_ville: e.target.value }))
  }
  className="h-10 w-full border border-gray-300 rounded-md px-2"
>
  <option value="">Sélectionnez la ville</option>
  <option value="Geneve">Genève</option>
  <option value="Vaud">Vaud</option>
  <option value="Zurich">Zurich</option>
  <option value="Bern">Bern</option>
  {/* Add more cities as needed */}
</select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Code postal <span style={{ color: '#C70036' }}>*</span></Label>
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
            <Label className="text-sm font-medium">Nom du contact <span style={{ color: '#C70036' }}>*</span></Label>
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
              Téléphone du contact <span style={{ color: '#C70036' }}>*</span>
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
        <Button
  variant="outline"
  onClick={goBack}
  className="bg-[#F3F4F6] text-[#70757c] border border-[#E5E7EB]"
>
  ← Retour
</Button>

       <Button
  onClick={() => setAddressSubStep(1)}
  disabled={!data.depart_adresse.adresse.trim()}
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none"
>
  Continuer 
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
          <Label className="text-sm font-medium">Adresse complète <span style={{ color: '#C70036' }}>*</span></Label>
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
            <Label className="text-sm font-medium">Pays <span style={{ color: '#C70036' }}>*</span></Label>
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
            <Label className="text-sm font-medium">État/province <span style={{ color: '#C70036' }}>*</span></Label>
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
            <Label className="text-sm font-medium">
  Votre ville <span style={{ color: '#C70036' }}>*</span>
</Label>
<select
  value={data.depart_ville}
  onChange={(e) =>
    setData((p) => ({ ...p, depart_ville: e.target.value }))
  }
  className="h-10 w-full border border-gray-300 rounded-md px-2"
  style={{ color: '#6A7282' }}
>
  <option value="">Sélectionnez la ville</option>
  <option value="Geneve">Genève</option>
  <option value="Vaud">Vaud</option>
  <option value="Zurich">Zurich</option>
  <option value="Bern">Bern</option>
  {/* Add more cities as needed */}
</select>


          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Code postal <span style={{ color: '#C70036' }}>*</span></Label>
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
            <Label className="text-sm font-medium">Nom du contact<span style={{ color: '#C70036' }}>*</span> </Label>
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
              Téléphone du contact <span style={{ color: '#C70036' }}>*</span> 
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
     <Button
  variant="outline"
  onClick={() => setAddressSubStep(0)}
  className="bg-[#F3F4F6] text-[#888d95] border border-[#E5E7EB]"
>
  ← Retour
</Button>

      <Button
  onClick={goNext}
  disabled={!data.arrivee_adresse.adresse.trim()}
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none"
>
  Continuer
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
  {/* Type de marchandise et Poids */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Type de marchandise <span style={{ color: '#C70036' }}>*</span>
      </Label>
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

    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Poids total (kg) <span style={{ color: '#C70036' }}>*</span>
      </Label>
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
  </div>

  {/* Volume et Nombre de colis */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Volume total (m³) <span style={{ color: '#C70036' }}>*</span>
      </Label>
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
       <Label className="text-sm font-medium">Nombre de colis</Label>
      <Input
        type="text"
        value={data.acces_autre ?? ""}
        placeholder=" Indiquez le nombre total de colis"
        onChange={(e) =>
          setData((p) => ({ ...p, acces_autre: e.target.value }))
        }
        className="h-10"
      />
    </div>
  </div>

  {/* Type de véhicule et Accès au site */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Type de véhicule requis <span style={{ color: '#C70036' }}>*</span>
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

    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Accès au site <span style={{ color: '#C70036' }}>*</span>
      </Label>
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
  </div>

  {/* Moyen de chargement et Précisez l'accès */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Moyen de chargement <span style={{ color: '#C70036' }}>*</span>
      </Label>
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

    <div className="space-y-2">
      <Label className="text-sm font-medium">Précisez l'accès (si "autre")</Label>
      <Input
        type="text"
        value={data.acces_autre ?? ""}
        placeholder="Décrivez les contraintes spécifiques"
        onChange={(e) =>
          setData((p) => ({ ...p, acces_autre: e.target.value }))
        }
        className="h-10"
      />
    </div>
  </div>
</div>
      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button
  variant="outline"
  onClick={goBack}
  className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB]"
>
  ← Retour
</Button>

       <Button
  onClick={() => setMerchandiseSubStep(1)}
  disabled={data.poids_total_kg < 0.1}
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none"
>
  Continuer 
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
                      Température min (°C) <span style={{ color: '#C70036' }}>*</span>
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
                      Température max (°C) <span style={{ color: '#C70036' }}>*</span>
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
                    <Label className="text-sm font-medium">Classe ADR <span style={{ color: '#C70036' }}>*</span></Label>
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
                    <Label className="text-sm font-medium">N° ONU <span style={{ color: '#C70036' }}>*</span></Label>
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
        <Button
  variant="outline"
  onClick={() => setMerchandiseSubStep(0)}
  className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB] rounded-md"
>
  ← Retour
</Button>

<Button
  onClick={goNext}
  disabled={!data.arrivee_adresse?.adresse?.trim()}
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none"
>
  Continuer
</Button>

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
     label: (
  <span className="text-[#186BB0] font-semibold">
    Créer un mandat
  </span>
),


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
                  Enlèvement souhaité — début <span style={{ color: '#C70036' }}>*</span>
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
                  
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Enlèvement souhaité — fin <span style={{ color: '#C70036' }}>*</span>
                </Label>
                <DateTimeInput
                  value={data.enlevement_souhaite_fin_at}
                  onChange={(val) =>
                    setData((p) => ({ ...p, enlevement_souhaite_fin_at: val }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                 
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
               
              </p>
            </div>
          </div>

          {/* Livraison prévue */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Livraison prévue</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Livraison prévue — début <span style={{ color: '#C70036' }}>*</span>
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
                  
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Livraison prévue — fin <span style={{ color: '#C70036' }}>*</span>
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
                  
                </p>
              </div>
            </div>
          </div>

          {/* Message d'information */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-[#0E406A] flex items-start gap-2">
              <span className="text-[#0E406A]">ℹ️</span>

              Les horaires exacts pourront être confirmés avec le transporteur
              après la mise en relation.<span style={{ color: '#C70036' }}>*</span>
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
            <Button
  variant="outline"
  onClick={back}
  size="lg"
  className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB] rounded-md"
>
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
  className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none rounded-md"
>
  Continuer 
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
    description: "Vérifiez les détails avant de confirmer l'envoi du mandat.",
    content: (next, back) => (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#111827]">Proposition tarifaire</h2>
          <p className="text-sm text-[#6B7280]">Vérifiez les détails avant de confirmer l'envoi du mandat.</p>
        </div>

        <div className="p-6 rounded-lg bg-[#F9FAFB] space-y-6">
          {/* Conditions d'expédition */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-[#6B7280]">Conditions d'expédition</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Distance calculée</span>
                <span className="text-sm font-medium text-[#111827]">{data.distance_km?.toFixed(0) || 'XX'} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Surface facturable</span>
                <span className="text-sm font-medium text-[#111827]">{data.surface_m2 || 'XX'} m²</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Supplément carburant</span>
                <span className="text-sm font-medium text-[#111827]">XXXX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Autres paramètres</span>
                <span className="text-sm font-medium text-[#111827]">XXXX</span>
              </div>
            </div>
          </div>

          {/* Détails des frais */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-[#6B7280]">Détails des frais</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">Prix estimé HT</span>
                <span className="text-sm font-medium text-[#111827]">{quote?.prixEstimeHt?.toFixed(2) || 'XX'} m²</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#6B7280]">TVA</span>
                <span className="text-sm font-medium text-[#111827]">XX %</span>
              </div>
            </div>
          </div>

          {/* Prix estimé TTC */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[#111827]">Prix estimé TTC</span>
              <span className="text-sm font-bold text-[#111827]">CHF {quote?.prixEstimeTtc?.toFixed(0) || 'XXX'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={back}
            size="lg"
            className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB] rounded-md"
          >
            ←Retour
          </Button>

          <Button
            onClick={next}
            size="lg"
            className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none rounded-md"
          >
            Continuer
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Pièces jointes et remarques
        </h2>
        <p className="text-gray-500 text-sm">
          Ajoutez les documents nécessaires et précisez les informations utiles au transporteur.
        </p>
      </div>

      {/* File upload section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Ajouter des documents — BL, CMR, etc.
        </label>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition">
          <div className="flex flex-col items-center space-y-2">
            {/* 🔹 Custom upload image instead of SVG */}
            <img
              src="/upload.png"
              alt="Upload"
              className="w-12 h-12 object-contain opacity-70"
            />

            <p className="text-sm text-gray-500">
              Glissez vos fichiers ici ou cliquez pour le téléverser.
            </p>
            <p className="text-xs text-gray-400">(Taille maximale : 30 Mo)</p>

            <input
              type="file"
              id="fileUpload"
              className="hidden"
              onChange={(e) => console.log(e.target.files[0])}
            />

            <label
              htmlFor="fileUpload"
              className="mt-3 px-4 py-2 bg-[#186BB0] text-white rounded-md hover:bg-[#145a96] transition cursor-pointer"
            >
              + Ajouter un fichier
            </label>
          </div>
        </div>
      </div>

      {/* Comment section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Commentaire expéditeur <span className="text-[#C70036]">*</span>
        </label>
        <textarea
          placeholder="Infos pratiques, accès, consignes particulières…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#186BB0] focus:border-transparent resize-none"
        />
      </div>

      {/* Footer buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={back}
          size="lg"
          className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB] rounded-md"
        >
          ← Retour
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
          className="bg-[#186BB0] text-white hover:bg-[#145a96] disabled:opacity-100 disabled:bg-[#186BB0] disabled:text-white disabled:pointer-events-none rounded-md"
        >
          Valider le mandat
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
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Signature du document
            </h2>
            <p className="text-gray-500 text-sm">
              Cette signature valide officiellement votre demande de transport.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Votre nom <span className="text-[#C70036]">*</span>
            </label>
            <input
              type="text"
              placeholder="Doit correspondre au signataire autorisé."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#186BB0]"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Il ne vous reste plus qu’à signer !{" "}
              <span className="text-[#C70036]">*</span>
            </label>

            <div className="border border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
              <img
                src="/Votre Nom Here.png"
                alt="Signature"
                className="mx-auto w-[260px] object-contain"
              />
            </div>

            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-[#45c4b0] w-[70%] rounded-full" />
              <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
               
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 space-y-3 border">
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
                <p className="text-gray-500 mt-1 text-sm">
                  Les informations que j'ai fournies sont exactes et complètes.
                  Je comprends que toute information incorrecte peut entraîner
                  des complications lors du transport.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={back}
              size="lg"
              className="bg-[#F3F4F6] text-[#99A1AF] border border-[#E5E7EB]"
            >
              ← Retour
            </Button>

            <Button
              onClick={next}
              disabled={!signatureOk}
              size="lg"
              className="bg-[#186BB0] text-white hover:bg-[#145a96] min-w-[200px]"
            >
              Publier le mandat
            </Button>
          </div>
        </div>
      ),
      isValid: () => Boolean(signatureOk),
    },
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
            <div className="flex items-center gap-2">
   <img
    src="/icons/file-lines.png"   // 👈 public folder ke liye correct path
    alt="icon"
    className="w-5 h-5 object-contain"
  />Mes mandats
</div>

            <ChevronRight size={16} />
            <span className="text-foreground font-medium">{current.label}</span>
            {/* <ChevronRight size={16} /> */}
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
  src="/avatar.png"
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
            <h1 className="text-lg font-semibold mb-1" >Créer un mandat</h1>
            <p className="text-xs text-muted-foreground">
              Suivez les étapes pour publier votre demande de transport.
            </p>
          </div>

          {/* Liste des étapes verticale */}
 <nav className="flex-1 space-y-1">
  {steps.map((step, idx) => {
    const isActive = idx === activeStep;
    const isCompleted = idx < activeStep;
    const StepIcon = stepIcons[idx];

    return (
      <div key={idx} className="relative">
        <button
          onClick={() => idx <= activeStep && setActiveStep(idx)}
          disabled={idx > activeStep}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-all duration-200 ${
            isActive
              ? "text-[#186BB0] bg-blue-50 font-semibold" // 🔵 active step (text blue)
              : isCompleted
              ? "text-black font-medium" // ✅ completed step (black text)
              : "text-gray-400" // upcoming step (gray)
          }`}
        >
          {/* ICON */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <Check size={18} className="text-green-600 font-bold" />
            ) : (
              <StepIcon
                size={18}
                className={
                  isActive
                    ? "text-[#186BB0]" // 🔵 icon blue when active
                    : "text-gray-400"
                }
              />
            )}
          </div>

          {/* LABEL */}
          <div
            className={`flex-1 min-w-0 text-sm ${
              isActive ? "text-[#186BB0]" : isCompleted ? "text-black" : ""
            }`}
          >
            {step.label}
          </div>
        </button>

        {/* Divider line between steps */}
        {idx < steps.length - 1 && (
          <div className="ml-4 h-4 w-px bg-gray-300"></div>
        )}
      </div>
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

    {/* Progress bar */}
    <div className="h-2 bg-[#13568D] rounded-full overflow-hidden">

      <div
        className="h-full bg-white transition-all duration-300"
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
      <footer className="border-t border-border py-6 px-8 text-sm text-muted-foreground flex items-center justify-between">
  <p>© 2025 Revers0. Tous droits réservés.</p>
  <div className="flex items-center gap-8">
    <p>Mentions légales</p>
    <p>Support</p>
  </div>
</footer>

    </div>
  );
}
