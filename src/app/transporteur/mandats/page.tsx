"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  MapPin,
  Clock,
  Calendar,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle,
  Eye,
  Truck,
} from "lucide-react";
import { MarketplaceMandat } from "@/types/mandat";
import Image from "next/image";
import { toast } from "sonner";

export default function TransporteurMarketplacePage() {
  const { user, handleTokenExpiration } = useAuth();
  const [mandats, setMandats] = useState<MarketplaceMandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMandat, setSelectedMandat] =
    useState<MarketplaceMandat | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [acceptingMandat, setAcceptingMandat] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    hasMore: false,
    nextCursor: null as string | null,
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  /**
   * @param Formatage de l'heure souhaitée pour l'affichage
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
   * @param Récupération des mandats disponibles dans le marketplace
   */
  const fetchMandats = useCallback(
    async (cursor?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer le token de session courant depuis Supabase
        const { supabase } = await import("@/supabase/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const params = new URLSearchParams({
          limit: "10",
          sort: sortOrder,
        });
        if (cursor) {
          params.append("cursor", cursor);
        }

        const response = await fetch(
          `/api/transporteur/mandats/marketplace?${params}`,
          {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            handleTokenExpiration();
            return;
          }
          throw new Error("Erreur lors de la récupération des mandats");
        }

        const data = await response.json();

        if (cursor) {
          // Pagination : ajouter aux mandats existants
          setMandats((prev) => [...prev, ...data.mandats]);
        } else {
          // Première page : remplacer les mandats
          setMandats(data.mandats);
        }

        setPagination({
          hasMore: data.pagination.hasMore,
          nextCursor: data.pagination.nextCursor,
        });
      } catch (err) {
        console.error("Erreur récupération mandats:", err);
        setError("Impossible de charger les mandats disponibles");
      } finally {
        setLoading(false);
      }
    },
    [handleTokenExpiration, sortOrder]
  );

  /**
   * @param Acceptation d'un mandat par le transporteur
   */
  const handleAcceptMandat = async (mandatId: number) => {
    try {
      setAcceptingMandat(mandatId);

      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/transporteur/mandats/${mandatId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }

        const errorData = await response.json();
        if (response.status === 409) {
          toast.error("Ce mandat a déjà été accepté par un autre transporteur");
        } else {
          toast.error(
            errorData.error || "Erreur lors de l'acceptation du mandat"
          );
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Mandat accepté avec succès !");
        // Retirer le mandat de la liste marketplace
        setMandats((prev) => prev.filter((m) => m.id !== mandatId));
        setShowDetails(false);
        setSelectedMandat(null);
      }
    } catch (err) {
      console.error("Erreur acceptation mandat:", err);
      toast.error("Erreur lors de l'acceptation du mandat");
    } finally {
      setAcceptingMandat(null);
    }
  };

  /**
   * @param Chargement initial des mandats
   */
  useEffect(() => {
    if (user) {
      fetchMandats();
    }
  }, [user, fetchMandats]);

  /**
   * @param Gestion du changement d'ordre de tri
   */
  const handleSortChange = (newSortOrder: "asc" | "desc") => {
    setSortOrder(newSortOrder);
    // Réinitialiser la pagination et recharger les mandats
    setPagination({ hasMore: false, nextCursor: null });
    setMandats([]);
    fetchMandats();
  };

  /**
   * @param Chargement de plus de mandats (pagination)
   */
  const loadMore = () => {
    if (pagination.hasMore && pagination.nextCursor) {
      fetchMandats(pagination.nextCursor);
    }
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="font-medium">Marketplace</div>
      </div>

      <main className="p-6 w-full">
        {/* Header avec actions */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Marketplace des mandats
            </h1>
            <p className="text-muted-foreground text-lg">
              Découvrez et acceptez les mandats de transport disponibles
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtres de tri */}
            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg border">
              <span className="text-sm font-medium text-foreground">
                Trier par :
              </span>
              <Select value={sortOrder} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48 border-0 bg-transparent focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Plus récent d'abord
                    </div>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Plus ancien d'abord
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMandats()}
              disabled={loading}
              className="px-4 py-2"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Vérification du statut de l'entreprise */}
        {user?.company?.status === "pending" && (
          <Alert className="mb-6 border-border bg-muted/50">
            <Truck className="h-4 w-4" />
            <AlertDescription>
              Votre entreprise est en attente de validation par nos
              administrateurs. Vous pourrez accepter des mandats une fois votre
              compte approuvé.
            </AlertDescription>
          </Alert>
        )}

        {/* Affichage des mandats */}
        {loading && mandats.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 px-6 pb-6">
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : mandats.length === 0 ? (
          <div className="text-center py-20 w-full">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-semibold mb-4 text-foreground">
              Aucun mandat disponible
            </h3>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
              Il n'y a actuellement aucun mandat disponible dans le marketplace.
              Revenez plus tard pour découvrir de nouvelles opportunités.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mandats.map((mandat) => (
                <Card
                  key={mandat.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-sm"
                >
                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-semibold text-foreground mb-1">
                          {mandat.nom || mandat.payload?.nom}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {mandat.company?.name || "Entreprise non spécifiée"}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className="ml-2 flex-shrink-0 bg-green-100 text-green-800 border-green-200"
                      >
                        Disponible
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 px-6 pb-6">
                    {/* Images */}
                    {(mandat.images || mandat.payload?.images) &&
                      (mandat.images || mandat.payload?.images)!.length > 0 && (
                        <div className="relative h-40 bg-muted rounded-xl overflow-hidden">
                          <Image
                            src={(mandat.images || mandat.payload?.images)![0]}
                            alt="Image du mandat"
                            fill
                            className="object-cover"
                          />
                          {(mandat.images || mandat.payload?.images)!.length >
                            1 && (
                            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                              +
                              {(mandat.images || mandat.payload?.images)!
                                .length - 1}
                            </div>
                          )}
                        </div>
                      )}

                    {/* Adresses */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground mb-1">
                            Départ
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {mandat.depart_adresse ||
                              mandat.payload?.adresse_depart?.adresse}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground mb-1">
                            Arrivée
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {mandat.arrivee_adresse ||
                              mandat.payload?.adresse_arrivee?.adresse}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Heure souhaitée */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Plage d'enlèvement
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mandat.enlevement_souhaite_debut_at &&
                          mandat.enlevement_souhaite_fin_at
                            ? `${formatHeureSouhaitee(
                                mandat.enlevement_souhaite_debut_at
                              )} - ${formatHeureSouhaitee(
                                mandat.enlevement_souhaite_fin_at
                              )}`
                            : mandat.payload?.heure_souhaitee
                            ? formatHeureSouhaitee(
                                mandat.payload.heure_souhaitee
                              )
                            : "Plage non définie"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() => {
                          setSelectedMandat(mandat);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-10 bg-green-600 hover:bg-green-700"
                        disabled={
                          user?.company?.status !== "approved" ||
                          acceptingMandat === mandat.id
                        }
                        onClick={() => handleAcceptMandat(mandat.id)}
                      >
                        {acceptingMandat === mandat.id ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Accepter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bouton "Charger plus" */}
            {pagination.hasMore && (
              <div className="mt-12 text-center w-full">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="px-10 py-4 h-14 text-lg font-medium"
                >
                  {loading ? (
                    <RefreshCw className="h-6 w-6 mr-3 animate-spin" />
                  ) : (
                    <Package className="h-6 w-6 mr-3" />
                  )}
                  Charger plus de mandats
                </Button>
              </div>
            )}
          </>
        )}

        {/* Dialog de détails */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedMandat && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedMandat.nom || selectedMandat.payload?.nom}
                  </DialogTitle>
                  <DialogDescription>
                    Détails complets du mandat de transport
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Images */}
                  {(selectedMandat.images || selectedMandat.payload?.images) &&
                    (selectedMandat.images || selectedMandat.payload?.images)!
                      .length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedMandat.images ||
                          selectedMandat.payload?.images)!.map(
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
                    )}

                  {/* Description */}
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMandat.description ||
                        selectedMandat.payload?.description}
                    </p>
                  </div>

                  {/* Adresses détaillées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Adresse de départ
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedMandat.depart_adresse ||
                          selectedMandat.payload?.adresse_depart?.adresse}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Adresse d'arrivée
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedMandat.arrivee_adresse ||
                          selectedMandat.payload?.adresse_arrivee?.adresse}
                      </p>
                    </div>
                  </div>

                  {/* Contacts */}
                  {(selectedMandat.depart_contact ||
                    selectedMandat.arrivee_contact) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMandat.depart_contact && (
                        <div>
                          <h4 className="font-medium mb-2">Contact départ</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedMandat.depart_contact}
                          </p>
                        </div>
                      )}
                      {selectedMandat.arrivee_contact && (
                        <div>
                          <h4 className="font-medium mb-2">Contact arrivée</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedMandat.arrivee_contact}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Horaires d'ouverture */}
                  {(selectedMandat.depart_horaires_ouverture ||
                    selectedMandat.arrivee_horaires_ouverture) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMandat.depart_horaires_ouverture && (
                        <div>
                          <h4 className="font-medium mb-2">Horaires départ</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMandat.depart_horaires_ouverture}
                          </p>
                        </div>
                      )}
                      {selectedMandat.arrivee_horaires_ouverture && (
                        <div>
                          <h4 className="font-medium mb-2">Horaires arrivée</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMandat.arrivee_horaires_ouverture}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Plage d'enlèvement et expéditeur */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Plage d'enlèvement
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedMandat.enlevement_souhaite_debut_at &&
                        selectedMandat.enlevement_souhaite_fin_at
                          ? `${formatHeureSouhaitee(
                              selectedMandat.enlevement_souhaite_debut_at
                            )} - ${formatHeureSouhaitee(
                              selectedMandat.enlevement_souhaite_fin_at
                            )}`
                          : selectedMandat.payload?.heure_souhaitee
                          ? formatHeureSouhaitee(
                              selectedMandat.payload.heure_souhaitee
                            )
                          : "Plage non définie"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Expéditeur
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedMandat.creator?.first_name}{" "}
                        {selectedMandat.creator?.last_name}
                      </p>
                    </div>
                  </div>

                  {/* Caractéristiques marchandise */}
                  {(selectedMandat.poids_total_kg ||
                    selectedMandat.volume_total_m3 ||
                    selectedMandat.type_marchandise) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Caractéristiques de la marchandise
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                        {selectedMandat.type_marchandise && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Type
                            </p>
                            <p className="text-sm font-medium">
                              {selectedMandat.type_marchandise}
                            </p>
                          </div>
                        )}
                        {selectedMandat.poids_total_kg && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Poids
                            </p>
                            <p className="text-sm font-medium">
                              {selectedMandat.poids_total_kg} kg
                            </p>
                          </div>
                        )}
                        {selectedMandat.volume_total_m3 && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Volume
                            </p>
                            <p className="text-sm font-medium">
                              {selectedMandat.volume_total_m3} m³
                            </p>
                          </div>
                        )}
                        {selectedMandat.nombre_colis && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Nombre de colis
                            </p>
                            <p className="text-sm font-medium">
                              {selectedMandat.nombre_colis}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Exigences transport */}
                  {(selectedMandat.type_vehicule ||
                    selectedMandat.type_acces ||
                    selectedMandat.moyen_chargement) && (
                    <div>
                      <h4 className="font-medium mb-3">
                        Exigences de transport
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedMandat.type_vehicule && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Type de véhicule
                            </p>
                            <p className="text-sm">
                              {selectedMandat.type_vehicule}
                            </p>
                          </div>
                        )}
                        {selectedMandat.type_acces && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Type d'accès
                            </p>
                            <p className="text-sm">
                              {selectedMandat.type_acces}
                              {selectedMandat.type_acces === "autre" &&
                                selectedMandat.acces_autre && (
                                  <span className="block text-muted-foreground">
                                    {selectedMandat.acces_autre}
                                  </span>
                                )}
                            </p>
                          </div>
                        )}
                        {selectedMandat.moyen_chargement && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Moyen de chargement
                            </p>
                            <p className="text-sm">
                              {selectedMandat.moyen_chargement}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contraintes spéciales */}
                  {(selectedMandat.sensi_temperature ||
                    selectedMandat.matiere_dangereuse) && (
                    <div>
                      <h4 className="font-medium mb-3">
                        Contraintes spéciales
                      </h4>
                      <div className="space-y-3">
                        {selectedMandat.sensi_temperature && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">
                                Sensible à la température
                              </p>
                              {(selectedMandat.temperature_min_c ||
                                selectedMandat.temperature_max_c) && (
                                <p className="text-xs text-muted-foreground">
                                  {selectedMandat.temperature_min_c &&
                                  selectedMandat.temperature_max_c
                                    ? `${selectedMandat.temperature_min_c}°C à ${selectedMandat.temperature_max_c}°C`
                                    : selectedMandat.temperature_min_c
                                    ? `Min: ${selectedMandat.temperature_min_c}°C`
                                    : `Max: ${selectedMandat.temperature_max_c}°C`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedMandat.matiere_dangereuse && (
                          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">
                                Matière dangereuse (ADR)
                              </p>
                              {(selectedMandat.adr_classe ||
                                selectedMandat.adr_uno) && (
                                <p className="text-xs text-muted-foreground">
                                  {selectedMandat.adr_classe &&
                                    `Classe ${selectedMandat.adr_classe}`}
                                  {selectedMandat.adr_classe &&
                                    selectedMandat.adr_uno &&
                                    " - "}
                                  {selectedMandat.adr_uno &&
                                    `N° ONU: ${selectedMandat.adr_uno}`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    disabled={
                      user?.company?.status !== "approved" ||
                      acceptingMandat === selectedMandat.id
                    }
                    onClick={() => handleAcceptMandat(selectedMandat.id)}
                  >
                    {acceptingMandat === selectedMandat.id ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Accepter ce mandat
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
