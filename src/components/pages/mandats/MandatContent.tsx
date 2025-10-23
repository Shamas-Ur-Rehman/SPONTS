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
              <FileText className="h-5 w-5" />
              Résumé du mandat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Un aperçu rapide avec les informations les plus importantes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Numéro du mandat
                  </span>
                </div>
                <div className="font-medium">
                  #MND-2024-{String(mandat.id).padStart(3, "0")}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Statut de facturation
                  </span>
                </div>
                <div>
                  <Badge
                    variant={
                      mandat.statut_facturation === "payee" ||
                      mandat.transporteur_status === "delivered"
                        ? "default"
                        : mandat.statut_facturation === "envoyee"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {mandat.statut_facturation === "payee"
                      ? "Payée"
                      : mandat.transporteur_status === "delivered"
                      ? "Livré"
                      : mandat.statut_facturation === "envoyee"
                      ? "Envoyée"
                      : mandat.statut_facturation === "en_attente"
                      ? "En attente"
                      : "Non facturé"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-4 w-full max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="font-medium text-blue-600">Départ</span>
                  </div>
                  <div className="flex-1">
                    <div className="border-t-2 border-dashed border-blue-300"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="font-medium text-blue-600">Arrivée</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Adresse
                    </div>
                    <div className="font-medium">
                      {mandat.depart_adresse ||
                        mandat.payload?.adresse_depart?.adresse ||
                        "Route de la Gare 12, 1020 Renens (VD)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Contact
                    </div>
                    <div className="font-medium">
                      {mandat.depart_contact || "Non renseigné"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Horaires d'ouverture
                    </div>
                    <div className="font-medium">
                      {mandat.depart_horaires_ouverture || "Non renseigné"}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Adresse
                    </div>
                    <div className="font-medium">
                      {mandat.arrivee_adresse ||
                        mandat.payload?.adresse_arrivee?.adresse ||
                        "Non renseigné"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Contact
                    </div>
                    <div className="font-medium">
                      {mandat.arrivee_contact || "Non renseigné"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Horaires d'ouverture
                    </div>
                    <div className="font-medium">
                      {mandat.arrivee_horaires_ouverture || "Non renseigné"}
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
              <Package className="h-5 w-5" />
              Caractéristiques du mandat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Détails techniques et contraintes de la marchandise.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Type de marchandise
                </span>
                <div className="font-medium">
                  {mandat.type_marchandise || "Électronique"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Volume total
                </span>
                <div className="font-medium">
                  {mandat.volume_total_m3 || "15"} m³
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Type de véhicule requis
                </span>
                <div className="font-medium">
                  {mandat.type_vehicule || "Fourgon 20m³"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Moyen de chargement
                </span>
                <div className="font-medium">
                  {mandat.moyen_chargement || "Transpalette"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Poids Total
                </span>
                <div className="font-medium">
                  {mandat.poids_total_kg || "2500"} kg
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Nombre de colis
                </span>
                <div className="font-medium">{mandat.nombre_colis || "45"}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Accès
                </span>
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
              <Clock className="h-5 w-5" />
              Suivi du mandat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Enlèvement souhaité</div>
                  <div className="text-sm text-muted-foreground">
                    24 novembre 2025
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-gray-900 flex items-center justify-center">
                  <User className="h-3 w-3 text-white" />
                </div>
                <div>
                  <div className="font-medium">Enlèvement confirmé</div>
                  <div className="text-sm text-muted-foreground">
                    24 novembre 2025 • 15h05
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Livraison prévue</div>
                  <div className="text-sm text-muted-foreground">
                    25 novembre 2025 • 10h47
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Livraison effective</div>
                  <div className="text-sm text-muted-foreground">
                    25 novembre 2025 • 10h47
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
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
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Bon de livraison ( BL )</span>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm">Facture</span>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Preuve de livraison ( POD )</span>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bouton vers la page complète (seulement dans le drawer) */}
        {showFullDetailsButton && (
          <div className="pt-4 border-t">
            <Link href={`/expediteur/mandats/${mandat.id}`}>
              <Button className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Voir le détail complet
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
