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
  Truck,
  MapPin,
  Clock,
  RefreshCw,
  Package,
  CheckCircle,
  AlertCircle,
  Clock as ClockIcon,
} from "lucide-react";
import { MarketplaceMandat, TransporteurStatus } from "@/types/mandat";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";

export default function TransporteurMesMandatsPage() {
  const { user, handleTokenExpiration } = useAuth();
  const [mandats, setMandats] = useState<MarketplaceMandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    hasMore: false,
    nextCursor: null as string | null,
  });

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
   * @param Récupération des mandats assignés au transporteur
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
        });
        if (cursor) {
          params.append("cursor", cursor);
        }

        const response = await fetch(
          `/api/transporteur/mandats/mine?${params}`,
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
        setError("Impossible de charger vos mandats");
      } finally {
        setLoading(false);
      }
    },
    [handleTokenExpiration]
  );

  /**
   * @param Mise à jour du statut d'un mandat
   */
  const handleUpdateStatus = async (
    mandatId: number,
    newStatus: TransporteurStatus
  ) => {
    try {
      setUpdatingStatus(mandatId);

      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/transporteur/mandats/${mandatId}/status`,
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
        toast.error(
          errorData.error || "Erreur lors de la mise à jour du statut"
        );
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Statut mis à jour vers ${getStatusLabel(newStatus)}`);
        // Mettre à jour le mandat dans la liste
        setMandats((prev) =>
          prev.map((m) =>
            m.id === mandatId ? { ...m, transporteur_status: newStatus } : m
          )
        );
      }
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(null);
    }
  };

  /**
   * @param Obtenir le label d'un statut
   */
  const getStatusLabel = (status: TransporteurStatus) => {
    switch (status) {
      case "accepted":
        return "Accepté";
      case "picked_up":
        return "Enlevé";
      case "delivered":
        return "Livré";
      case "delivery_problem":
        return "Problème de livraison";
      default:
        return status;
    }
  };

  /**
   * @param Obtenir la couleur d'un badge selon le statut
   */
  const getStatusBadgeVariant = (status: TransporteurStatus) => {
    switch (status) {
      case "accepted":
        return "default";
      case "picked_up":
        return "secondary";
      case "delivered":
        return "default";
      case "delivery_problem":
        return "destructive";
      default:
        return "outline";
    }
  };

  /**
   * @param Obtenir l'icône d'un statut
   */
  const getStatusIcon = (status: TransporteurStatus) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "picked_up":
        return <Package className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "delivery_problem":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
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
   * @param Chargement de plus de mandats (pagination)
   */
  const loadMore = () => {
    if (pagination.hasMore && pagination.nextCursor) {
      fetchMandats(pagination.nextCursor);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="font-medium">Mes mandats</div>
      </div>

      <main className="p-6">
        {/* Header avec actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Mes mandats
            </h1>
            <p className="text-muted-foreground">
              Gérez les mandats que vous avez acceptés
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMandats()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Affichage des mandats */}
        {loading && mandats.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : mandats.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun mandat assigné</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore accepté de mandats. Rendez-vous sur le
              marketplace pour découvrir les mandats disponibles.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mandats.map((mandat) => (
                <Link
                  key={mandat.id}
                  href={`/transporteur/mesmandats/${mandat.id}`}
                  className="block"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {mandat.nom || mandat.payload?.nom}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground truncate">
                            {mandat.company?.name || "Entreprise non spécifiée"}
                          </p>
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(
                            mandat.transporteur_status || "accepted"
                          )}
                          className="ml-2 flex-shrink-0"
                        >
                          {getStatusIcon(
                            mandat.transporteur_status || "accepted"
                          )}
                          <span className="ml-1">
                            {getStatusLabel(
                              mandat.transporteur_status || "accepted"
                            )}
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Images */}
                      {(mandat.images || mandat.payload?.images) &&
                        (mandat.images || mandat.payload?.images)!.length >
                          0 && (
                          <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={
                                (mandat.images || mandat.payload?.images)![0]
                              }
                              alt="Image du mandat"
                              fill
                              className="object-cover"
                            />
                            {(mandat.images || mandat.payload?.images)!.length >
                              1 && (
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                +
                                {(mandat.images || mandat.payload?.images)!
                                  .length - 1}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Adresses */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">Départ</p>
                            <p className="text-muted-foreground truncate">
                              {mandat.depart_adresse ||
                                mandat.payload?.adresse_depart?.adresse}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">Arrivée</p>
                            <p className="text-muted-foreground truncate">
                              {mandat.arrivee_adresse ||
                                mandat.payload?.adresse_arrivee?.adresse}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Heure souhaitée */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-foreground">
                            Plage d'enlèvement
                          </p>
                          <span>
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
                          </span>
                        </div>
                      </div>

                      {/* Sélecteur de statut */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statut</label>
                        <Select
                          value={mandat.transporteur_status || "accepted"}
                          onValueChange={(value: TransporteurStatus) =>
                            handleUpdateStatus(mandat.id, value)
                          }
                          disabled={updatingStatus === mandat.id}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accepted">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Accepté
                              </div>
                            </SelectItem>
                            <SelectItem value="picked_up">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Enlevé
                              </div>
                            </SelectItem>
                            <SelectItem value="delivered">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Livré
                              </div>
                            </SelectItem>
                            <SelectItem value="delivery_problem">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Problème de livraison
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Bouton "Charger plus" */}
            {pagination.hasMore && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  Charger plus de mandats
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
