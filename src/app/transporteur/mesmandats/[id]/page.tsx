"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Truck,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { MarketplaceMandat, TransporteurStatus } from "@/types/mandat";
import Image from "next/image";
import { toast } from "sonner";

export default function TransporteurMandatDetailPage() {
  const { user, handleTokenExpiration } = useAuth();
  const params = useParams();
  const router = useRouter();
  const mandatId = params.id as string;

  const [mandat, setMandat] = useState<MarketplaceMandat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  /**
   * Formatage de l'heure pour l'affichage
   */
  const formatHeureSouhaitee = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeString;
    }
  };

  /**
   * Récupération du détail du mandat
   */
  const fetchMandatDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/transporteur/mandats/mine`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        throw new Error("Erreur lors de la récupération du mandat");
      }

      const data = await response.json();
      const foundMandat = data.mandats.find(
        (m: MarketplaceMandat) => m.id.toString() === mandatId
      );

      if (!foundMandat) {
        setError("Mandat non trouvé");
        return;
      }

      setMandat(foundMandat);
    } catch (err) {
      console.error("Erreur récupération mandat:", err);
      setError("Impossible de charger le détail du mandat");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mise à jour du statut du mandat
   */
  const updateMandatStatus = async (newStatus: TransporteurStatus) => {
    if (!mandat) return;

    try {
      setUpdatingStatus(true);

      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/transporteur/mandats/${mandat.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }

      const result = await response.json();
      if (result.success) {
        setMandat((prev) =>
          prev ? { ...prev, transporteur_status: newStatus } : null
        );
        toast.success("Statut mis à jour avec succès !");
      }
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Rendu du badge de statut
   */
  const getStatusBadge = (status?: TransporteurStatus) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-800">Accepté</Badge>;
      case "picked_up":
        return <Badge className="bg-orange-100 text-orange-800">Enlevé</Badge>;
      case "delivered":
        return <Badge className="bg-green-100 text-green-800">Livré</Badge>;
      case "delivery_problem":
        return <Badge variant="destructive">Problème</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  useEffect(() => {
    if (mandatId) {
      fetchMandatDetail();
    }
  }, [mandatId]);

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="font-medium">Détail du mandat</div>
        </div>
        <main className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  if (error || !mandat) {
    return (
      <>
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="font-medium">Détail du mandat</div>
        </div>
        <main className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Mandat non trouvé"}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/transporteur/mesmandats")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à mes mandats
          </Button>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="font-medium">Détail du mandat #{mandat.id}</div>
      </div>

      <main className="p-6">
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/transporteur/mesmandats")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {mandat.nom || mandat.payload?.nom}
              </h1>
              <p className="text-muted-foreground">
                Mandat #{mandat.id} • {mandat.company?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(mandat.transporteur_status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {(mandat.images || mandat.payload?.images) &&
              (mandat.images || mandat.payload?.images)!.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Images du mandat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(mandat.images || mandat.payload?.images)!.map(
                        (image: string, index: number) => (
                          <div
                            key={index}
                            className="relative h-32 bg-muted rounded-lg overflow-hidden"
                          >
                            <Image
                              src={image}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {mandat.description || mandat.payload?.description}
                </p>
              </CardContent>
            </Card>

            {/* Adresses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Itinéraire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-800 mb-1">
                      Point de départ
                    </p>
                    <p className="text-sm text-green-700">
                      {mandat.depart_adresse ||
                        mandat.payload?.adresse_depart?.adresse}
                    </p>
                    {mandat.depart_contact && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {mandat.depart_contact}
                      </p>
                    )}
                    {mandat.depart_horaires_ouverture && (
                      <p className="text-xs text-green-600 mt-1 whitespace-pre-line">
                        {mandat.depart_horaires_ouverture}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-800 mb-1">
                      Point d'arrivée
                    </p>
                    <p className="text-sm text-red-700">
                      {mandat.arrivee_adresse ||
                        mandat.payload?.adresse_arrivee?.adresse}
                    </p>
                    {mandat.arrivee_contact && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {mandat.arrivee_contact}
                      </p>
                    )}
                    {mandat.arrivee_horaires_ouverture && (
                      <p className="text-xs text-red-600 mt-1 whitespace-pre-line">
                        {mandat.arrivee_horaires_ouverture}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Caractéristiques marchandise */}
            {(mandat.poids_total_kg ||
              mandat.volume_total_m3 ||
              mandat.type_marchandise) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Caractéristiques de la marchandise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mandat.type_marchandise && (
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Type
                        </p>
                        <p className="font-medium">{mandat.type_marchandise}</p>
                      </div>
                    )}
                    {mandat.poids_total_kg && (
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Poids
                        </p>
                        <p className="font-medium">
                          {mandat.poids_total_kg} kg
                        </p>
                      </div>
                    )}
                    {mandat.volume_total_m3 && (
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Volume
                        </p>
                        <p className="font-medium">
                          {mandat.volume_total_m3} m³
                        </p>
                      </div>
                    )}
                    {mandat.nombre_colis && (
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Colis
                        </p>
                        <p className="font-medium">{mandat.nombre_colis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exigences transport */}
            {(mandat.type_vehicule ||
              mandat.type_acces ||
              mandat.moyen_chargement) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Exigences de transport
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mandat.type_vehicule && (
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Type de véhicule
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mandat.type_vehicule}
                        </p>
                      </div>
                    )}
                    {mandat.type_acces && (
                      <div>
                        <p className="text-sm font-medium mb-1">Type d'accès</p>
                        <p className="text-sm text-muted-foreground">
                          {mandat.type_acces}
                          {mandat.type_acces === "autre" &&
                            mandat.acces_autre && (
                              <span className="block">
                                {mandat.acces_autre}
                              </span>
                            )}
                        </p>
                      </div>
                    )}
                    {mandat.moyen_chargement && (
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Moyen de chargement
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mandat.moyen_chargement}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contraintes spéciales */}
            {(mandat.sensi_temperature || mandat.matiere_dangereuse) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contraintes spéciales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mandat.sensi_temperature && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Sensible à la température</p>
                        {(mandat.temperature_min_c ||
                          mandat.temperature_max_c) && (
                          <p className="text-sm text-muted-foreground">
                            {mandat.temperature_min_c &&
                            mandat.temperature_max_c
                              ? `${mandat.temperature_min_c}°C à ${mandat.temperature_max_c}°C`
                              : mandat.temperature_min_c
                              ? `Min: ${mandat.temperature_min_c}°C`
                              : `Max: ${mandat.temperature_max_c}°C`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {mandat.matiere_dangereuse && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Matière dangereuse (ADR)</p>
                        {(mandat.adr_classe || mandat.adr_uno) && (
                          <p className="text-sm text-muted-foreground">
                            {mandat.adr_classe && `Classe ${mandat.adr_classe}`}
                            {mandat.adr_classe && mandat.adr_uno && " - "}
                            {mandat.adr_uno && `N° ONU: ${mandat.adr_uno}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plage d'enlèvement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Plage d'enlèvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {mandat.enlevement_souhaite_debut_at &&
                  mandat.enlevement_souhaite_fin_at
                    ? `${formatHeureSouhaitee(
                        mandat.enlevement_souhaite_debut_at
                      )} - ${formatHeureSouhaitee(
                        mandat.enlevement_souhaite_fin_at
                      )}`
                    : mandat.payload?.heure_souhaitee
                    ? formatHeureSouhaitee(mandat.payload.heure_souhaitee)
                    : "Plage non définie"}
                </p>
              </CardContent>
            </Card>

            {/* Gestion du statut */}
            <Card>
              <CardHeader>
                <CardTitle>Gestion du statut</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Statut actuel
                  </label>
                  <Select
                    value={mandat.transporteur_status || "accepted"}
                    onValueChange={(value: TransporteurStatus) =>
                      updateMandatStatus(value)
                    }
                    disabled={updatingStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Accepté
                        </div>
                      </SelectItem>
                      <SelectItem value="picked_up">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-orange-600" />
                          Enlevé
                        </div>
                      </SelectItem>
                      <SelectItem value="delivered">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Livré
                        </div>
                      </SelectItem>
                      <SelectItem value="delivery_problem">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          Problème de livraison
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {updatingStatus && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Mise à jour en cours...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations expéditeur */}
            <Card>
              <CardHeader>
                <CardTitle>Expéditeur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {mandat.creator?.first_name} {mandat.creator?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mandat.company?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Créé le{" "}
                    {new Date(mandat.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
