"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdKeyboardArrowRight } from "react-icons/md";
import { SlHome } from "react-icons/sl";
import { FaSliders } from "react-icons/fa6";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MandatDrawer } from "@/components/pages/mandats/MandatDrawer";
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Clock as ClockIcon,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
} from "lucide-react";
import { Mandat } from "@/types/mandat";
import Link from "next/link";
import { toast } from "sonner";

export default function MandatsPage() {
  const { user, handleTokenExpiration } = useAuth();
  const router = useRouter();
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingMandatId, setDeletingMandatId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mandatToDelete, setMandatToDelete] = useState<Mandat | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedMandat, setSelectedMandat] = useState<Mandat | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  /**
   * Fix: compute a strictly typed avatarSrc (string | undefined) so <img src={...} />
   * does not receive an object ({}) which caused "Type '{}' is not assignable to type 'string | Blob | undefined'".
   * When user.avatar_url is not a string, we fall back to a temporary public image (Google placeholder).
   */
  const avatarSrc: string = (() => {
    // If the user object provides a string avatar url, use it.
    if (typeof user?.avatar_url === "string" && user.avatar_url.length > 0) {
      return user.avatar_url;
    }
    // fallback to a public Google-hosted placeholder image for now
    return "https://www.gstatic.com/images/branding/product/1x/avatar_circle_grey_512dp.png";
  })();

  const fetchMandats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/mandats", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        await handleTokenExpiration(
          "Session expirée lors du chargement des mandats"
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Erreur lors du chargement des mandats"
        );
      }

      setMandats(result.mandats || []);
      setUserRole(result.userRole || null);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("401") ||
          err.message.includes("403") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Forbidden"))
      ) {
        await handleTokenExpiration(
          "Erreur d'authentification lors du chargement des mandats"
        );
        return;
      }

      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [handleTokenExpiration]);

  const handleDeleteClick = (mandat: Mandat) => {
    setMandatToDelete(mandat);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!mandatToDelete) return;

    try {
      setDeletingMandatId(mandatToDelete.id);
      setShowDeleteDialog(false);

      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/mandats/delete?id=${mandatToDelete.id}`,
        {
          method: "DELETE",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        }
      );

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        await handleTokenExpiration("Session expirée lors de la suppression");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erreur lors de la suppression");
      }

      setMandats((prev) => prev.filter((m) => m.id !== mandatToDelete.id));
      toast.success("Mandat supprimé avec succès");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("401") ||
          err.message.includes("403") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Forbidden"))
      ) {
        await handleTokenExpiration(
          "Erreur d'authentification lors de la suppression"
        );
        return;
      }

      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setDeletingMandatId(null);
      setMandatToDelete(null);
    }
  };

  useEffect(() => {
    fetchMandats();
  }, [fetchMandats]);

  const filteredMandats = mandats.filter((mandat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (mandat.nom || mandat.payload?.nom || "")
        .toLowerCase()
        .includes(searchLower) ||
      (mandat.description || mandat.payload?.description || "")
        .toLowerCase()
        .includes(searchLower) ||
      (mandat.depart_adresse || mandat.payload?.adresse_depart?.adresse || "")
        .toLowerCase()
        .includes(searchLower) ||
      (mandat.arrivee_adresse || mandat.payload?.adresse_arrivee?.adresse || "")
        .toLowerCase()
        .includes(searchLower) ||
      mandat.id.toString().includes(searchLower)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMandats.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMandats = filteredMandats.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleRowClick = (mandat: Mandat) => {
    setSelectedMandat(mandat);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedMandat(null);
  };

  const renderTypeBadge = (type?: string) => {
    if (!type)
      return (
        <Badge variant="outline" className="text-xs">
          Non spécifié
        </Badge>
      );
    if (type.toLowerCase().includes("palette")) {
      return (
        <Badge className="text-xs bg-[#EDF7FF] text-[#186BB0] border-transparent">
          Palette
        </Badge>
      );
    }
    return (
      <Badge className="text-xs bg-[#F6F9FF] text-[#334155] border-transparent">
        {type}
      </Badge>
    );
  };

  const renderStatusBadge = (status?: string) => {
    if (!status)
      return (
        <Badge variant="outline" className="text-xs">
          En attente
        </Badge>
      );

    switch (status) {
      case "delivered":
        return (
          <Badge className="text-xs bg-[#ECFDF5] text-[#059669] border-transparent">
            Livré
          </Badge>
        );
      case "picked_up":
        return (
          <Badge className="text-xs bg-[#FEF3C7] text-[#92400E] border-transparent">
            Enlevé
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="text-xs bg-[#EEF2FF] text-[#3730A3] border-transparent">
            Accepté
          </Badge>
        );
      case "delivery_problem":
        return (
          <Badge className="text-xs bg-[#FFF1F2] text-[#BE123C] border-transparent">
            Problème
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            En attente
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-[#101828]">
            <IoDocumentTextOutline className="h-4 w-4 text-[#6B7280]" />
            <span className="font-medium text-[#101828]">Mes mandats</span>
            <MdKeyboardArrowRight className="h-4 w-4 text-[#9CA3AF]" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/expediteur/mandats/create")}
            size="sm"
            className="bg-[#0B69A3] text-white hover:bg-[#095d8b] rounded-md flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un mandat
            
          </Button>
          
          <div className="w-9 h-9 rounded-full overflow-hidden border">
            {/* avatarSrc is guaranteed to be a string now (never {}), so TypeScript error is avoided */}
            <img
              alt="avatar"
             src="/avatar.png"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <main className="p-6 bg-white">
        <div className="space-y-4 mb-6">
          <div className="mb-6 w-full">
            <label className="text-[#101828] block mb-2">Search</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="N° mandat, ville, transporteur…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-4">
              <label className="text-xs text-[#101828] mb-1 block">
                Période <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  placeholder="Toutes périodes"
                  className="rounded-md pr-10 w-full"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <div className="col-span-4">
              <label className="text-xs text-[#101828] mb-1 block">
                Statut
              </label>
              <div className="relative">
                <Input
                  placeholder="Tous statuts"
                  className="rounded-md pr-10 w-full"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <div className="col-span-4">
              <label className="text-xs text-[#101828] mb-1 block">
                Type de marchandise
              </label>
              <div className="relative">
                <Input
                  placeholder="Tous types"
                  className="rounded-md pr-10 w-full"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-3 py-1.5 rounded-lg bg-[#186BB0] text-white text-sm font-medium">
              <SlHome className="inline-block mr-1 font-bold mb-1 w-4 h-4" />
              En cours
            </button>
            <button className="px-3 py-1.5 rounded-md bg-transparent text-sm text-[#6B7280] ">
              <FaSliders className="inline-block mr-1 mb-1 w-4 h-4 ml-1" />
              Historique
            </button>
          </div>
        </div>

        {user?.company?.status === "pending" && (
          <Alert className="mb-6 border-border bg-muted/50">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground">
              <strong>Validation en cours :</strong> Votre entreprise est en
              cours de validation par notre équipe. Les mandats seront
              accessibles une fois votre compte approuvé.
            </AlertDescription>
          </Alert>
        )}

        {user?.company?.status === "rejected" && (
          <Alert className="mb-6 border-destructive/20 bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-foreground">
              <strong>Accès refusé :</strong> Votre demande d'inscription a été
              refusée.
              {user.company.rejection_reason && (
                <> Motif : {user.company.rejection_reason}</>
              )}
              Contactez notre équipe pour plus d'informations.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-semibold mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchMandats} variant="outline">
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredMandats.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "Aucun résultat" : "Aucun mandat"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm
                    ? "Aucun mandat ne correspond à votre recherche."
                    : ["owner", "admin"].includes(userRole || "")
                    ? "Vous n'avez pas encore créé de mandat de transport."
                    : "Aucun mandat n'a été créé dans cette entreprise."}
                </p>
                {!searchTerm &&
                  ["owner", "admin"].includes(userRole || "") &&
                  user?.company?.status === "approved" && (
                    <Link href="/expediteur/mandats/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer mon premier mandat
                      </Button>
                    </Link>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FBFDFF]">
                    <TableHead>N° Mandat</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prix Estimé</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMandats.map((mandat) => (
                    <TableRow
                      key={mandat.id}
                      className="cursor-pointer hover:bg-[#FBFBFB]"
                      onClick={() => handleRowClick(mandat)}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/expediteur/mandats/${mandat.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0B69A3] text-sm font-medium"
                        >
                          {`MND-${new Date().getFullYear()}-${String(
                            mandat.id
                          ).padStart(3, "0")}`}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[220px] truncate">
                          <div className="font-medium text-sm">
                            {mandat.nom ||
                              mandat.payload?.nom ||
                              "Non spécifié"}
                          </div>
                          {mandat.description && (
                            <div className="text-xs text-[#6B7280] truncate">
                              {mandat.description}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#10B981] rounded-full" />
                            <div>
                              <div className="text-[#0F172A] truncate">
                                {mandat.depart_adresse ||
                                  mandat.payload?.adresse_depart?.adresse ||
                                  "Départ non défini"}
                              </div>
                            </div>
                          </div>

                          <div className="my-2 border-l-2 border-dashed border-[#E6E9EE] h-2 ml-3" />

                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#EF4444] rounded-full" />
                            <div>
                              <div className="text-[#0F172A] truncate">
                                {mandat.arrivee_adresse ||
                                  mandat.payload?.adresse_arrivee?.adresse ||
                                  "Arrivée non définie"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {mandat.transporteur_company_id ? (
                          <div className="text-sm text-[#0B69A3]">
                            Transporteur attribué
                          </div>
                        ) : (
                          <div className="text-sm text-[#6B7280] italic">
                            À attribuer
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {renderTypeBadge(mandat.type_marchandise)}
                      </TableCell>

                      <TableCell>
                        {renderStatusBadge(mandat.transporteur_status)}
                      </TableCell>

                      <TableCell>
                        {mandat.prix_estime_ttc ? (
                          <div className="font-medium">
                            {new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: mandat.monnaie || "EUR",
                            }).format(mandat.prix_estime_ttc)}
                          </div>
                        ) : (
                          <div className="text-sm text-[#6B7280] italic">
                            Non calculé
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {mandat.statut_facturation ? (
                          <a
                            href={`/invoices/${mandat.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-[#0B69A3] underline"
                          >
                            id_facture.pdf
                          </a>
                        ) : (
                          <div className="text-sm text-[#9CA3AF] italic">
                            Indisponible
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/expediteur/mandats/${mandat.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          {["owner", "admin"].includes(userRole || "") && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {mandat.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(mandat);
                                  }}
                                  disabled={deletingMandatId === mandat.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#6B7280]">
                  Affichage de {startIndex + 1} à{" "}
                  {Math.min(startIndex + itemsPerPage, filteredMandats.length)}{" "}
                  sur {filteredMandats.length} résultats
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <div>
                Êtes-vous sûr de vouloir supprimer le mandat{" "}
                <strong>
                  &ldquo;{mandatToDelete?.nom || mandatToDelete?.payload?.nom}
                  &rdquo;
                </strong>{" "}
                ? Cette action est irréversible.
              </div>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deletingMandatId !== null}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deletingMandatId !== null}
              >
                {deletingMandatId !== null ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MandatDrawer
          mandat={selectedMandat}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </main>
    </>
  );
}
