"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DollarSign, Plus, ArrowLeft, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PricingSet {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function PricingListPage() {
  const router = useRouter();
  const [pricings, setPricings] = useState<PricingSet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasActive = pricings?.some((p) => p.is_active);

  useEffect(() => {
    loadPricings();
  }, []);

  const loadPricings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/pricing");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du chargement des pricings");
      }
      const data = await res.json();
      setPricings(data.data?.pricings || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireOnboardingCompleted={false}>
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Gestion des pricings
              </h1>
              <p className="text-sm text-muted-foreground">
                Liste des grilles tarifaires
              </p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/pricing/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau pricing
              </Button>
            </Link>
          </div>
        </div>

        <main className="p-6 space-y-6">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && <p className="text-destructive text-center">{error}</p>}

          {pricings && pricings.length === 0 && !loading && (
            <p className="text-muted-foreground text-center">
              Aucune grille tarifaire pour le moment.
            </p>
          )}

          {/* Alerte aucun actif */}
          {!hasActive && !loading && (
            <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-md text-destructive text-sm mb-6">
              Aucun pricing actif. Veuillez définir un modèle actif pour que les
              mandats puissent être calculés.
            </div>
          )}

          {pricings && pricings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pricings.map((pricing) => (
                <Card
                  key={pricing.id}
                  className="relative group border-border bg-card"
                >
                  {/* Delete icon */}
                  <button
                    onClick={() => setDeleteId(pricing.id)}
                    className="absolute top-4 right-4 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Bouton Activer */}
                  {!pricing.is_active && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await fetch(
                          `/api/admin/pricing/${pricing.id}`,
                          {
                            method: "PATCH",
                          }
                        );
                        if (res.ok) {
                          toast.success("Pricing activé");
                          setPricings(
                            pricings!.map((p) => ({
                              ...p,
                              is_active: p.id === pricing.id,
                            }))
                          );
                        } else {
                          const err = await res.json();
                          toast.error(err.error || "Activation échouée");
                        }
                      }}
                      className="absolute bottom-4 right-4 px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Utiliser
                    </button>
                  )}

                  <div
                    className="h-full w-full cursor-pointer"
                    onClick={() => router.push(`/admin/pricing/${pricing.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        {pricing.name}
                        {pricing.is_active && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Actif
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Créé le{" "}
                      {new Date(pricing.created_at).toLocaleDateString()}
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Dialog confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le pricing ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible.
          </p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => (deleting ? null : setDeleteId(null))}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteId) return;
                setDeleting(true);
                const res = await fetch(`/api/admin/pricing/${deleteId}`, {
                  method: "DELETE",
                });
                if (res.ok) {
                  toast.success("Pricing supprimé");
                  if (pricings) {
                    setPricings(pricings.filter((p) => p.id !== deleteId));
                  }
                } else {
                  const err = await res.json();
                  toast.error(err.error || "Suppression échouée");
                }
                setDeleting(false);
                setDeleteId(null);
              }}
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
