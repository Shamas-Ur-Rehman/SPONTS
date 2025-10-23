"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DollarSign, ArrowLeft } from "lucide-react";

interface PricingSet {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  variables: Record<string, number | string | boolean>;
  supplements: {
    nom: string;
    type: string;
    montant: number;
  }[];
}

type Props = {
  params: { id: string };
};

export default function PricingDetailPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const [pricing, setPricing] = useState<PricingSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/pricing/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du chargement du pricing");
      }
      const data = await res.json();
      setPricing(data.data?.pricing);
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
                Détail du pricing
              </h1>
              <p className="text-sm text-muted-foreground">
                Grille tarifaire #{id}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Link href="/admin/pricing">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
          </div>
        </div>

        <main className="p-6 space-y-6">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {error && (
            <p className="text-destructive text-center mt-4">{error}</p>
          )}

          {pricing && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    {pricing.name}
                    {pricing.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Actif
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Créé le {new Date(pricing.created_at).toLocaleDateString()}
                </CardContent>
              </Card>

              {/* Variables */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(pricing.variables || {}).length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Aucune variable définie.
                    </p>
                  )}
                  {Object.entries(pricing.variables || {}).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(pricing.variables).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/40"
                        >
                          <span className="font-medium text-foreground">
                            {key}
                          </span>
                          <span className="text-right">
                            {typeof value === "number"
                              ? value.toLocaleString()
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Suppléments</CardTitle>
                </CardHeader>
                <CardContent>
                  {(!pricing.supplements ||
                    pricing.supplements.length === 0) && (
                    <p className="text-muted-foreground text-sm">
                      Aucun supplément défini.
                    </p>
                  )}
                  {pricing.supplements && pricing.supplements.length > 0 && (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 text-left font-medium">Nom</th>
                            <th className="py-2 text-left font-medium">Type</th>
                            <th className="py-2 text-left font-medium">
                              Montant
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.supplements.map((s, idx) => (
                            <tr key={idx} className="border-b last:border-none">
                              <td className="py-2">{s.nom}</td>
                              <td className="py-2">{s.type}</td>
                              <td className="py-2">
                                {s.montant.toLocaleString()}{" "}
                                {s.type === "pct" ? "%" : "CHF"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
