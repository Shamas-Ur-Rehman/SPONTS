"use client";

import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CirclePlus, FileText, TrendingUp } from "lucide-react";

export default function ExpediteurPage() {
  const { user, handleTokenExpiration } = useAuthContext();
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    mandats: number;
  } | null>(null);

  /**
   * @param Vérification si l'utilisateur est expéditeur
   */
  const isExpediteur = user?.user_data?.role === "expediteur";

  /**
   * @param Chargement des statistiques personnelles du dashboard
   *
   * Appelle l'API sécurisée et stocke les résultats, avec gestion du chargement et des erreurs
   */
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setErrorStats(null);

      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/dashboard/stats", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      const result = await response.json();

      // Vérifier si c'est une erreur d'authentification
      if (response.status === 401 || response.status === 403) {
        await handleTokenExpiration(
          "Session expirée lors du chargement des stats"
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Erreur lors du chargement des statistiques"
        );
      }

      setStats(result.stats);
    } catch (err) {
      // Vérifier si l'erreur est liée à l'authentification
      if (
        err instanceof Error &&
        (err.message.includes("401") ||
          err.message.includes("403") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Forbidden"))
      ) {
        await handleTokenExpiration(
          "Erreur d'authentification lors du chargement des stats"
        );
        return;
      }

      setErrorStats(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingStats(false);
    }
  }, [handleTokenExpiration]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="font-medium">Tableau de bord</div>
      </div>

      <main className="p-6">
        {/* Section de bienvenue */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenue{" "}
            {user?.user_data?.first_name && (
              <span className="text-primary">{user.user_data.first_name}</span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de votre activité sur la plateforme.
          </p>
        </div>

        {/* Carte principale des mandats - seulement pour les expéditeurs */}
        {isExpediteur && (
          <div className="max-w-md">
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 shadow-lg">
              <div className="absolute top-4 right-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Mes mandats créés
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl font-bold text-foreground">
                    {loadingStats ? (
                      <div className="animate-pulse bg-muted rounded h-10 w-16"></div>
                    ) : errorStats ? (
                      <span className="text-red-600 text-2xl">—</span>
                    ) : (
                      <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {stats?.mandats ?? 0}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(stats?.mandats ?? 0) === 0
                      ? "Aucun mandat créé pour le moment"
                      : (stats?.mandats ?? 0) === 1
                      ? "mandat créé"
                      : "mandats créés"}
                  </p>
                </div>
              </div>

              {errorStats && (
                <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3">
                  <div className="text-sm text-red-800">
                    <strong>Erreur:</strong> {errorStats}
                  </div>
                </div>
              )}

              {!loadingStats && !errorStats && (stats?.mandats ?? 0) === 0 && (
                <div className="mt-6">
                  <Link href="/expediteur/mandats/create">
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <CirclePlus className="h-4 w-4 mr-2" />
                      Créer mon premier mandat
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions rapides - seulement pour les expéditeurs */}
        {isExpediteur &&
          !loadingStats &&
          !errorStats &&
          (stats?.mandats ?? 0) > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <Link href="/expediteur/mandats/create">
                  <div className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CirclePlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Nouveau mandat</h3>
                        <p className="text-sm text-muted-foreground">
                          Créer un nouveau mandat de transport
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/expediteur/mandats">
                  <div className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Voir mes mandats</h3>
                        <p className="text-sm text-muted-foreground">
                          Consulter tous vos mandats existants
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

        {/* Message pour les non-expéditeurs */}
        {!isExpediteur && (
          <div className="max-w-md">
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/5 via-background to-muted/10 p-6 shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {user?.company_membership
                      ? "Membre de l'entreprise"
                      : "Accès aux mandats"}
                  </span>
                </div>

                <div className="space-y-1">
                  {user?.company_membership ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Vous êtes{" "}
                        {user.company_membership.role === "owner"
                          ? "propriétaire"
                          : user.company_membership.role === "admin"
                          ? "administrateur"
                          : "membre"}{" "}
                        de l'entreprise <strong>{user.company?.name}</strong>.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vous pouvez consulter les mandats dans la section{" "}
                        <Link
                          href="/expediteur/mandats"
                          className="text-primary hover:underline"
                        >
                          Mandats
                        </Link>
                        .
                      </p>
                      {user.company_membership.role === "member" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          En tant que membre, vous pouvez voir les mandats mais
                          ne pouvez pas les créer ou les modifier.
                        </p>
                      )}
                      {["owner", "admin"].includes(
                        user.company_membership.role
                      ) && (
                        <p className="text-xs text-primary/80 mt-2">
                          Vous pouvez créer et gérer les mandats de
                          l'entreprise.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Vous devez avoir le rôle d&apos;expéditeur pour créer et
                      gérer des mandats de transport.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
