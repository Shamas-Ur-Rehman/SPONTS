"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStatsData } from "@/types/admin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Building2,
  FileText,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
} from "lucide-react";

/**
 * @param Page d'accueil de l'administration Spontis
 *
 * Dashboard avec statistiques et navigation vers les différentes sections
 */
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  /**
   * @param Chargement des statistiques d'administration
   *
   * Récupère les stats des entreprises et mandats en attente
   */
  const loadStats = async () => {
    try {
      setLoading(true);

      // Récupérer les stats des entreprises et mandats en parallèle
      const [companiesResponse, mandatsResponse] = await Promise.all([
        fetch("/api/admin/companies"),
        fetch("/api/admin/mandats"),
      ]);

      if (!companiesResponse.ok) {
        const error = await companiesResponse.json();
        throw new Error(
          error.error || "Erreur lors du chargement des entreprises"
        );
      }

      if (!mandatsResponse.ok) {
        const error = await mandatsResponse.json();
        throw new Error(error.error || "Erreur lors du chargement des mandats");
      }

      const [companiesData, mandatsData] = await Promise.all([
        companiesResponse.json(),
        mandatsResponse.json(),
      ]);

      setStats({
        companies: companiesData.data.stats,
        mandats: mandatsData.data.stats,
      });
    } catch (err) {
      console.error("Erreur chargement stats:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireOnboardingCompleted={false}>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-2 p-4 border-b bg-card">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Administration Spontis
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestion des entreprises et mandats
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <Link href="/expediteur">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au site
                </Button>
              </Link>
            </div>
          </div>
          <main className="p-6">
            <div className="space-y-6">
              {/* Header avec titre */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  Tableau de bord
                </h1>
                <p className="text-muted-foreground">
                  Vue d'ensemble de l'activité de la plateforme
                </p>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Navigation Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requireOnboardingCompleted={false}>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-2 p-4 border-b bg-card">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Administration Spontis
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestion des entreprises et mandats
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <Link href="/expediteur">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au site
                </Button>
              </Link>
            </div>
          </div>
          <main className="p-6">
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
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const totalCompanies =
    (stats?.companies.pending || 0) +
    (stats?.companies.approved || 0) +
    (stats?.companies.rejected || 0);

  return (
    <ProtectedRoute requireOnboardingCompleted={false}>
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Administration Spontis
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestion des entreprises et mandats
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Link href="/expediteur">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au site
              </Button>
            </Link>
          </div>
        </div>

        <main className="p-6">
          <div className="space-y-6">
            {/* Header avec titre */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Tableau de bord
              </h1>
              <p className="text-muted-foreground">
                Vue d'ensemble de l'activité de la plateforme
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Entreprises en attente */}
              <Card className="border-muted bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Entreprises en attente
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.companies.pending || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    En cours de validation
                  </p>
                </CardContent>
              </Card>

              {/* Entreprises approuvées */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Entreprises approuvées
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.companies.approved || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actives sur la plateforme
                  </p>
                </CardContent>
              </Card>

              {/* Mandats en attente */}
              <Card className="border-muted bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Mandats en attente
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats?.mandats.pending || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    En cours de validation
                  </p>
                </CardContent>
              </Card>

              {/* Total entreprises */}
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total entreprises
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalCompanies}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tous statuts confondus
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Modération Entreprises */}
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border-border bg-card"
                onClick={() => router.push("/admin/companies")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Building2 className="h-6 w-6 text-primary" />
                    Modération des entreprises
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Approuver ou rejeter les demandes d'inscription des
                    entreprises
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.companies.pending || 0} en attente
                      </Badge>
                      {(stats?.companies.pending || 0) > 0 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <Button size="sm">
                      Gérer les entreprises
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Modération Mandats */}
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border-border bg-card"
                onClick={() => router.push("/admin/mandats")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <FileText className="h-6 w-6 text-primary" />
                    Modération des mandats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Approuver ou rejeter les mandats avant publication
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.mandats.pending || 0} en attente
                      </Badge>
                      {(stats?.mandats.pending || 0) > 0 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <Button size="sm">
                      Gérer les mandats
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Gestion des Pricings */}
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border-border bg-card"
                onClick={() => router.push("/admin/pricing")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <DollarSign className="h-6 w-6 text-primary" />
                    Gestion des pricings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Consulter, créer ou modifier les grilles tarifaires
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Toutes les grilles
                    </span>
                    <Button size="sm">
                      Gérer les pricings
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
