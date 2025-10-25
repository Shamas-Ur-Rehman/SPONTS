"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Package,
  Eye,
  Clock,
  Download,
  User,
  CheckCircle,
} from "lucide-react";
import { Mandat } from "@/types/mandat";
import Link from "next/link";

interface MandatContentProps {
  mandat: Mandat;
  showFullDetailsButton?: boolean;
  isDrawer?: boolean;
}

export function MandatContent({
  mandat,
  showFullDetailsButton = false,
  isDrawer = false,
}: MandatContentProps) {
  /**
   * Formatage du prix
   */
  const formatPrice = (price: number, currency: string = "EUR"): string => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  return (
    <div
      className={`grid gap-6 ${isDrawer ? "grid-cols-1" : "lg:grid-cols-3"}`}
    >
      {/* Colonne principale */}
      <div className={`space-y-6 ${isDrawer ? "" : "lg:col-span-2"}`}>
        {/* Résumé du mandat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <FileText className="h-5 w-5" /> */}
              Résumé du mandat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Un aperçu rapide avec les informations les plus importantes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
  <div className="space-y-4">
    {/* Numéro du mandat */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/file-invoice.png" // 👈 apna icon daalna
          alt="Mandat Icon"
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-muted-foreground">
          Numéro du mandat
        </span>
      </div>
      <div className="font-medium">
        #MND-2024-{String(mandat.id).padStart(3, "0")}
      </div>
    </div>

    {/* Transporteur */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/truck.png"
          alt="Transporteur Icon"
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-muted-foreground">
          Transporteur
        </span>
      </div>
      <div className="font-medium">
        {(mandat as any).transporteur_company?.name ||
          (mandat as any).transporteur_company?.legal_name ||
          (mandat.transporteur_company_id
            ? "Transporteur attribué"
            : "Non attribué")}
      </div>
    </div>

    {/* Statut de facturation */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/refresh.png"
          alt="Facturation Icon"
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-muted-foreground">
          Statut de facturation
        </span>
      </div>
      <div>
        <div className="flex items-center justify-end">
  {mandat.transporteur_status === "delivered" ? (
    // 👇 Livré icon
    <img
      src="/Badge.png" // ⬅️ yahan apni image ka path do
      alt="Livré"
      className="h-6 w-6 object-contain"
    />
  ) : mandat.statut_facturation === "payee" ? (
    // 👇 Payée icon
    <img
      src="/Badge.png" // ⬅️ apni image ka path
      alt="Payée"
      className="h-6 w-6 object-contain"
    />
  ) : mandat.statut_facturation === "envoyee" ? (
    // 👇 Envoyée icon
    <img
      src="/Badge.png"
      alt="Envoyée"
      className="h-6 w-6 object-contain"
    />
  ) : mandat.statut_facturation === "en_attente" ? (
    // 👇 En attente icon
    <img
      src="/Badge.png"
      alt="En attente"
      className="h-6 w-6 object-contain"
    />
  ) : (
    // 👇 Default icon
    <img
      src="/Badge.png"
      alt="Non facturé"
      className="h-9 w-9 object-contain"
    />
  )}
</div>

      </div>
    </div>

    {/* Date de création */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/calendar-month.png"
          alt="Calendar Icon"
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-muted-foreground">
          Date de création
        </span>
      </div>
      <div className="font-medium">
        {new Date(mandat.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    </div>

    {/* Prix estimé TTC */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/cash.png"
          alt="Prix Icon"
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-muted-foreground">
          Prix estimé TTC
        </span>
      </div>
      <div className="font-medium">
        {mandat.prix_estime_ttc
          ? formatPrice(mandat.prix_estime_ttc, mandat.monnaie)
          : "Non calculé"}
      </div>
    </div>
  </div>

  {/* Trajet */}
<div className="border-t pt-4">
  {/* Header with icons - matching the image design */}
  <div className="flex items-center justify-between mb-8 px-4">
    {/* Départ */}
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2" style={{ borderColor: '#186BB0' }}>
        <img
          src="/map-pin-alt.png"
          alt="Départ Icon"
          className="h-6 w-6"
        />
      </div>
      <div className="text-base font-semibold" style={{ color: '#186BB0' }}>de Renens</div>
      <div className="text-sm text-gray-500">Départ</div>
    </div>

    {/* Center Truck Icon with dashed lines */}
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#186BB0' }}></div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-4" style={{ backgroundColor: '#186BB0' }}>
        <img
          src="/truck.png"
          alt="Transport Icon"
          className="h-6 w-6 brightness-0 invert"
        />
      </div>
      <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#186BB0' }}></div>
    </div>

    {/* Arrivée */}
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2" style={{ borderColor: '#186BB0' }}>
        <img
          src="/map-pin-alt.png"
          alt="Arrivée Icon"
          className="h-6 w-6"
        />
      </div>
      <div className="text-base font-semibold" style={{ color: '#186BB0' }}>à Lausanne</div>
      <div className="text-sm text-gray-500">Arrivée</div>
    </div>
  </div>

  {/* Details Grid */}
  <div className="grid grid-cols-2 gap-8 border-t pt-6">
    {/* Départ */}
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500 mb-1.5">Adresse</div>
        <div className="font-medium text-gray-900">
          {mandat.depart_adresse ||
            mandat.payload?.adresse_depart?.adresse ||
            "Route de la Gare 12, 1020 Renens (VD)"}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1.5">Contact</div>
        <div className="font-medium text-gray-900">
          {mandat.depart_contact || "Marc Aeby — 079 456 12 34"}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1.5">
          Horaires d'ouverture
        </div>
        <div className="font-medium text-gray-900">
          {mandat.depart_horaires_ouverture || "Lun–Ven : 07h30–16h30"}
        </div>
      </div>
    </div>

    {/* Arrivée */}
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500 mb-1.5">Adresse</div>
        <div className="font-medium text-gray-900">
          {mandat.arrivee_adresse ||
            mandat.payload?.adresse_arrivee?.adresse ||
            "Rue du Simplon 45, 1006 Lausanne"}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1.5">Contact</div>
        <div className="font-medium text-gray-900">
          {mandat.arrivee_contact || "Nathalie Rochat — 078 943 56 21"}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1.5">
          Horaires d'ouverture
        </div>
        <div className="font-medium text-gray-900">
          {mandat.arrivee_horaires_ouverture || "Lun–Ven : 08h00–18h00"}
        </div>
      </div>
    </div>
  </div>
</div>
</CardContent>

        </Card>

        {/* Caractéristiques du mandat */}
       <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      {/* <Package className="h-5 w-5" /> */}
      Caractéristiques du mandat
    </CardTitle>
    <p className="text-sm text-muted-foreground">
      Détails techniques et contraintes de la marchandise.
    </p>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="space-y-4">
      {/* Type de marchandise */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/archive.png" alt="Type de marchandise" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Type de marchandise
          </span>
        </div>
        <div className="font-medium">
          {mandat.type_marchandise || "Électronique"}
        </div>
      </div>

      {/* Volume total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/cubes-stacked.png" alt="Volume total" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Volume total
          </span>
        </div>
        <div className="font-medium">{mandat.volume_total_m3 || "15"} m³</div>
      </div>

      {/* Type de véhicule requis */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/truck.png" alt="Type de véhicule" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Type de véhicule requis
          </span>
        </div>
        <div className="font-medium">{mandat.type_vehicule || "Fourgon 20m³"}</div>
      </div>

      {/* Moyen de chargement */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/1.png" alt="Moyen de chargement" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Moyen de chargement
          </span>
        </div>
        <div className="font-medium">
          {mandat.moyen_chargement || "Transpalette"}
        </div>
      </div>

      {/* Poids total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/2.png" alt="Poids total" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Poids Total
          </span>
        </div>
        <div className="font-medium">{mandat.poids_total_kg || "2500"} kg</div>
      </div>

      {/* Nombre de colis */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/3.png" alt="Nombre de colis" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Nombre de colis
          </span>
        </div>
        <div className="font-medium">{mandat.nombre_colis || "45"}</div>
      </div>

      {/* Accès */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/4.png" alt="Accès" className="w-5 h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Accès
          </span>
        </div>
        <div className="font-medium">
          {mandat.type_acces || "Quai de déchargement"}
        </div>
      </div>
    </div>
  </CardContent>
</Card>

      </div>

      {/* Colonne latérale */}
      <div className="space-y-6">
        {/* Suivi du mandat */}
   <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      {/* <img
        src="/path/to/clock-icon.png" // 👈 apna clock icon daalna
        alt="Clock"
        className="h-5 w-5"
      /> */}
      Suivi du mandat
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="relative space-y-3">
      {/* Vertical dashed line */}
      <div className="absolute left-2.5 top-3 bottom-0 w-px border-l border-gray-300"
        style={{ borderStyle: "dashed" }} // 👈 vertical line with small dashes
      ></div>

      {/* Step 1 */}
      <div className="flex items-center gap-3 relative">
        <img
          src="/Icon.png" // 👈 apna green check icon
          alt="Step Icon"
          className="h-5 w-5 z-10 bg-white rounded-full"
        />
        <div>
          <div className="font-medium">Enlèvement souhaité</div>
          <div className="text-sm text-muted-foreground">
            24 novembre 2025
          </div>
        </div>
      </div>

      {/* Step 2 */}
    <div className="flex items-center gap-3 relative">
  {/* <div className="h-5 w-5  "> */}
    <img
      src="/Icon.png" // 👈 apna user icon
      alt="User"
      className="h-5 w-5 z-10 bg-white rounded-full"
    />
  {/* </div> */}
  <div>
    <div className="font-medium">Enlèvement confirmé</div>
    <div className="text-sm text-muted-foreground">
      24 novembre 2025 • 15h05
    </div>
  </div>
</div>


      {/* Step 3 */}
      <div className="flex items-center gap-3 relative">
        <img
          src="/Icon.png"
          alt="Step Icon"
          className="h-5 w-5 z-10 bg-white rounded-full"
        />
        <div>
          <div className="font-medium">Livraison prévue</div>
          <div className="text-sm text-muted-foreground">
            25 novembre 2025 • 10h47
          </div>
        </div>
      </div>

      {/* Step 4 */}
      <div className="flex items-center gap-3 relative">
        <img
          src="/Icon1.png"
          alt="Step Icon"
          className="h-5 w-5 z-10 bg-white rounded-full"
        />
        <div>
          <div className="font-medium">Livraison effective</div>
          <div className="text-sm text-muted-foreground">
            25 novembre 2025 • 10h47
          </div>
        </div>
      </div>

      {/* Step 5 */}
      <div className="flex items-center gap-3 relative">
        <img
          src="/Icon.png"
          alt="Step Icon"
          className="h-5 w-5 z-10 bg-white rounded-full"
        />
        <div>
          <div className="font-medium">Livraison effective</div>
          <div className="text-sm text-muted-foreground">
            25 novembre 2025 • 10h45
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>



        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
       <CardContent className="space-y-3">
  {/* Bon de livraison */}
  <div className="flex items-center justify-between p-2 border rounded">
    <div className="flex items-center gap-2">
      <img
        src="/file-pdf.png" // 👈 apni BL icon image
        alt="BL Icon"
        className="h-4 w-4"
      />
      <span className="text-sm">Bon de livraison ( BL )</span>
    </div>
    <Button variant="ghost" size="sm" className="p-1">
      <img
        src="/download.png" // 👈 apni download image
        alt="Download"
        className="h-4 w-4"
      />
    </Button>
  </div>

  {/* Facture */}
  <div className="flex items-center justify-between p-2 border rounded">
    <div className="flex items-center gap-2">
      <img
        src="/file-pdf.png" // 👈 apni Facture icon image
        alt="Facture Icon"
        className="h-4 w-4"
      />
      <span className="text-sm">Facture</span>
    </div>
    <Button variant="ghost" size="sm" className="p-1">
      <img
        src="/download.png" // 👈 same ya alag image use kar sakti ho
        alt="Download"
        className="h-4 w-4"
      />
    </Button>
  </div>

  {/* Preuve de livraison */}
  <div className="flex items-center justify-between p-2 border rounded">
    <div className="flex items-center gap-2">
      <img
        src="/file-pdf.png" // 👈 apni POD icon image
        alt="POD Icon"
        className="h-4 w-4"
      />
      <span className="text-sm">Preuve de livraison ( POD )</span>
    </div>
    <Button variant="ghost" size="sm" className="p-1">
      <img
        src="/download.png" // 👈 apna custom download icon
        alt="Download"
        className="h-4 w-4"
      />
    </Button>
  </div>
</CardContent>

        </Card>

        {/* Bouton vers la page complète (seulement dans le drawer) */}
        {/* {showFullDetailsButton && (
          <div className="pt-4 border-t">
            <Link href={`/expediteur/mandats/${mandat.id}`}>
              <Button className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Voir le détail complet
              </Button>
            </Link>
          </div>
        )} */}
        
      </div>
  {/* <footer className="w-310 border-t border-border py-5 px-5 text-sm text-muted-foreground hidden md:flex items-center justify-between">
  <p>© 2025 Revers0. Tous droits réservés.</p>
  <div className="flex items-center gap-10">
    <p>Mentions légales</p>
    <p>Support</p>
  </div>
</footer>  */}
     
    </div>
    
  );
}
