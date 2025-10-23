"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MandatModerationData } from "@/types/admin";
import {
  FileText,
  MapPin,
  Calendar,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Building2,
  User,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

/**
 * @param Page de modération des mandats
 *
 * Liste et gestion des mandats en attente de validation
 */
export default function AdminMandats() {
  const router = useRouter();
  const [mandats, setMandats] = useState<MandatModerationData[]>([]);
  const [stats, setStats] = useState<{
    pending: number;
    approved: number;
    rejected: number;
  }>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modal d'action (approve/reject)
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    mandat: MandatModerationData | null;
    action: "approve" | "reject";
    reason: string;
    processing: boolean;
  }>({
    show: false,
    mandat: null,
    action: "approve",
    reason: "",
    processing: false,
  });

  useEffect(() => {
    loadMandats();
    loadStats();
  }, [statusFilter]);

  /**
   * @param Chargement des statistiques globales
   *
   * Récupère les statistiques de tous les mandats
   */
  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/mandats?status=all&limit=1000");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du chargement des stats");
      }

      const data = await response.json();
      const allMandats = data.data.mandats;

      setStats({
        pending: allMandats.filter(
          (m: MandatModerationData) => m.status === "pending"
        ).length,
        approved: allMandats.filter(
          (m: MandatModerationData) => m.status === "approved"
        ).length,
        rejected: allMandats.filter(
          (m: MandatModerationData) => m.status === "rejected"
        ).length,
      });
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    }
  };

  /**
   * @param Chargement de la liste des mandats
   *
   * Récupère les mandats selon le filtre sélectionné
   */
  const loadMandats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/mandats?status=${statusFilter}&limit=50`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du chargement");
      }

      const data = await response.json();
      setMandats(data.data.mandats);
    } catch (err) {
      console.error("Erreur chargement mandats:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param Traitement d'une action de modération
   *
   * Approuve ou rejette un mandat avec un motif optionnel
   */
  const handleAction = async () => {
    if (!actionModal.mandat) return;

    try {
      setActionModal((prev) => ({ ...prev, processing: true }));

      const endpoint = `/api/admin/mandats/${actionModal.mandat.id}/${actionModal.action}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: actionModal.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error ||
            `Erreur lors de l'${
              actionModal.action === "approve" ? "approbation" : "rejet"
            }`
        );
      }

      // Succès
      toast.success(
        `Mandat ${
          actionModal.action === "approve" ? "approuvé" : "rejeté"
        } avec succès`
      );

      // Fermer la modal et recharger
      setActionModal({
        show: false,
        mandat: null,
        action: "approve",
        reason: "",
        processing: false,
      });

      await loadMandats();
      await loadStats();
    } catch (err) {
      console.error(`Erreur ${actionModal.action}:`, err);
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setActionModal((prev) => ({ ...prev, processing: false }));
    }
  };

  /**
   * @param Ouverture de la modal d'action
   */
  const openActionModal = (
    mandat: MandatModerationData,
    action: "approve" | "reject"
  ) => {
    setActionModal({
      show: true,
      mandat,
      action,
      reason: "",
      processing: false,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-primary/10 text-primary">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvé
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/10 text-destructive"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHeureSouhaitee = (dateTimeString: string): string => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeString;
    }
  };

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Erreur d'accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            className="w-full"
          >
            Retour au dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-10">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Modération des mandats
            </h1>
            <p className="text-muted-foreground">
              Gestion des mandats avant publication
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value: StatusFilter) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadMandats();
              loadStats();
            }}
            disabled={loading}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.approved}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejetés</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.rejected}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des mandats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mandats.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun mandat</h3>
              <p className="text-sm text-muted-foreground">
                Aucun mandat trouvé avec le filtre sélectionné.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mandats.map((mandat) => (
            <Card key={mandat.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {mandat.nom || mandat.payload?.nom}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(mandat.status || "pending")}
                      <span className="text-xs text-muted-foreground">
                        #{mandat.id}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mandat.description || mandat.payload?.description}
                </p>

                {/* Images */}
                {(mandat.images || mandat.payload?.images) &&
                  (mandat.images || mandat.payload?.images)!.length > 0 && (
                    <div className="flex gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex gap-1">
                        {(mandat.images || mandat.payload?.images)!
                          .slice(0, 3)
                          .map((image: string, index: number) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded border overflow-hidden bg-muted"
                            >
                              <Image
                                src={image}
                                alt={`Image ${index + 1}`}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        {(mandat.images || mandat.payload?.images)!.length >
                          3 && (
                          <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            +
                            {(mandat.images || mandat.payload?.images)!.length -
                              3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Adresses */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-green-600">Départ</div>
                      <div className="text-muted-foreground line-clamp-1">
                        {mandat.depart_adresse ||
                          mandat.payload?.adresse_depart?.adresse}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-red-600">Arrivée</div>
                      <div className="text-muted-foreground line-clamp-1">
                        {mandat.arrivee_adresse ||
                          mandat.payload?.adresse_arrivee?.adresse}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heure souhaitée */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-600">
                      Plage d'enlèvement
                    </div>
                    <div className="text-muted-foreground">
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
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {mandat.company?.name || "Entreprise non renseignée"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {mandat.creator
                        ? `${mandat.creator.first_name} ${mandat.creator.last_name}`
                        : "Créateur non renseigné"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Créé le {formatDate(mandat.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {mandat.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => openActionModal(mandat, "approve")}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openActionModal(mandat, "reject")}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                )}

                {/* Motif de rejet */}
                {mandat.status === "rejected" && mandat.rejection_reason && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <strong>Motif du refus :</strong> {mandat.rejection_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal d'action */}
      <Dialog
        open={actionModal.show}
        onOpenChange={(open) =>
          !actionModal.processing &&
          setActionModal((prev) => ({ ...prev, show: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.action === "approve"
                ? "Approuver le mandat"
                : "Rejeter le mandat"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.action === "approve"
                ? `Êtes-vous sûr de vouloir approuver le mandat "${
                    actionModal.mandat?.nom || actionModal.mandat?.payload?.nom
                  }" ?`
                : `Êtes-vous sûr de vouloir rejeter le mandat "${
                    actionModal.mandat?.nom || actionModal.mandat?.payload?.nom
                  }" ?`}
            </DialogDescription>
          </DialogHeader>

          {actionModal.action === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motif du refus (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Expliquez pourquoi ce mandat est rejeté..."
                value={actionModal.reason}
                onChange={(e) =>
                  setActionModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionModal((prev) => ({ ...prev, show: false }))
              }
              disabled={actionModal.processing}
            >
              Annuler
            </Button>
            <Button
              variant={
                actionModal.action === "approve" ? "default" : "destructive"
              }
              onClick={handleAction}
              disabled={actionModal.processing}
            >
              {actionModal.processing
                ? "Traitement..."
                : actionModal.action === "approve"
                ? "Approuver"
                : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
