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
import { CompanyModerationData } from "@/types/admin";
import {
  Building2,
  Mail,
  Calendar,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Users,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

/**
 * @param Page de modération des entreprises
 *
 * Liste et gestion des entreprises en attente de validation
 */
export default function AdminCompanies() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyModerationData[]>([]);
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
    company: CompanyModerationData | null;
    action: "approve" | "reject";
    reason: string;
    processing: boolean;
  }>({
    show: false,
    company: null,
    action: "approve",
    reason: "",
    processing: false,
  });

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, [statusFilter]);

  /**
   * @param Chargement des statistiques globales
   *
   * Récupère les statistiques de toutes les entreprises
   */
  const loadStats = async () => {
    try {
      const response = await fetch(
        "/api/admin/companies?status=all&limit=1000"
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du chargement des stats");
      }

      const data = await response.json();
      const allCompanies = data.data.companies;

      setStats({
        pending: allCompanies.filter(
          (c: CompanyModerationData) => c.status === "pending"
        ).length,
        approved: allCompanies.filter(
          (c: CompanyModerationData) => c.status === "approved"
        ).length,
        rejected: allCompanies.filter(
          (c: CompanyModerationData) => c.status === "rejected"
        ).length,
      });
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    }
  };

  /**
   * @param Chargement de la liste des entreprises
   *
   * Récupère les entreprises selon le filtre sélectionné
   */
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/companies?status=${statusFilter}&limit=50`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du chargement");
      }

      const data = await response.json();
      setCompanies(data.data.companies);
    } catch (err) {
      console.error("Erreur chargement companies:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param Traitement d'une action de modération
   *
   * Approuve ou rejette une entreprise avec un motif optionnel
   */
  const handleAction = async () => {
    if (!actionModal.company) return;

    try {
      setActionModal((prev) => ({ ...prev, processing: true }));

      const endpoint = `/api/admin/companies/${actionModal.company.id}/${actionModal.action}`;
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
        `Entreprise ${
          actionModal.action === "approve" ? "approuvée" : "rejetée"
        } avec succès`
      );

      // Fermer la modal et recharger
      setActionModal({
        show: false,
        company: null,
        action: "approve",
        reason: "",
        processing: false,
      });

      await loadCompanies();
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
    company: CompanyModerationData,
    action: "approve" | "reject"
  ) => {
    setActionModal({
      show: true,
      company,
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
            Approuvée
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/10 text-destructive"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejetée
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
    <div className="space-y-6 p-8">
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
              Modération des entreprises
            </h1>
            <p className="text-muted-foreground">
              Gestion des demandes d'inscription des entreprises
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
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadCompanies();
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
                <p className="text-sm text-muted-foreground">Approuvées</p>
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
                <p className="text-sm text-muted-foreground">Rejetées</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.rejected}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des entreprises */}
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
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucune entreprise</h3>
              <p className="text-sm text-muted-foreground">
                Aucune entreprise trouvée avec le filtre sélectionné.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {company.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(company.status)}
                      <span className="text-xs text-muted-foreground">
                        #{company.id}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Informations de contact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {company.billing_email}
                    </span>
                  </div>
                  {/* TODO: Ajouter phone et address depuis billing_address si nécessaire */}
                  {false && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        À implémenter
                      </span>
                    </div>
                  )}
                  {false && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground line-clamp-1">
                        À implémenter
                      </span>
                    </div>
                  )}
                </div>

                {/* Informations supplémentaires */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {/* TODO: Implémenter member_count depuis company_members */}
                      0 membre
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Inscrite le {formatDate(company.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {company.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => openActionModal(company, "approve")}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openActionModal(company, "reject")}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                )}

                {/* Motif de rejet */}
                {company.status === "rejected" && company.rejection_reason && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <strong>Motif du refus :</strong> {company.rejection_reason}
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
                ? "Approuver l'entreprise"
                : "Rejeter l'entreprise"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.action === "approve"
                ? `Êtes-vous sûr de vouloir approuver l'entreprise "${actionModal.company?.name}" ?`
                : `Êtes-vous sûr de vouloir rejeter l'entreprise "${actionModal.company?.name}" ?`}
            </DialogDescription>
          </DialogHeader>

          {actionModal.action === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motif du refus (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Expliquez pourquoi cette entreprise est rejetée..."
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
