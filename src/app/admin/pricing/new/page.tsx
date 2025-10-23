"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DollarSign, ArrowLeft, Trash2, PlusCircle } from "lucide-react";

export default function NewPricingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tarifKm, setTarifKm] = useState<number>(0);
  const [majCarburant, setMajCarburant] = useState<number>(0);
  const [majEmbouteillage, setMajEmbouteillage] = useState<number>(0);
  const [tvaRate, setTvaRate] = useState<number>(7.7);

  // Surcharge grue
  const [surchargeType, setSurchargeType] = useState<"pct" | "fixe">("pct");
  const [surchargeValue, setSurchargeValue] = useState<number>(0);

  // Autres suppléments dynamiques
  const [otherSupps, setOtherSupps] = useState<
    { nom: string; type: "pct" | "fixe"; montant: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const variablesPayload = {
        tarif_km_base_chf: tarifKm,
        maj_carburant_pct: majCarburant,
        maj_embouteillage_pct: majEmbouteillage,
        tva_rate_pct: tvaRate,
      };

      const supplementsPayload = [
        // surcharge grue si valeur >0
        ...(surchargeValue > 0
          ? [
              {
                nom: "Surcharge grue",
                type: surchargeType === "pct" ? "pct" : "fixe",
                montant: surchargeValue,
              },
            ]
          : []),
        ...otherSupps.filter((s) => s.nom && s.montant > 0),
      ];

      const payload = {
        name,
        variables: variablesPayload,
        supplements: supplementsPayload,
      };
      const res = await fetch("/api/admin/pricing/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création");
      }
      router.push("/admin/pricing");
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
                Nouveau pricing
              </h1>
              <p className="text-sm text-muted-foreground">
                Créer une nouvelle grille tarifaire
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

        <main className="p-6">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-foreground">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}
              {/* Nom */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du pricing"
                />
              </div>

              {/* Tarif de base au km */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tarif de base au km (CHF)
                  </label>
                  <Input
                    type="number"
                    value={tarifKm}
                    onChange={(e) => setTarifKm(parseFloat(e.target.value))}
                  />
                </div>

                {/* Maj carburant */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Majoration carburant (%)
                  </label>
                  <Input
                    type="number"
                    value={majCarburant}
                    onChange={(e) =>
                      setMajCarburant(parseFloat(e.target.value))
                    }
                  />
                </div>

                {/* Maj embouteillage */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Majoration embouteillage (%)
                  </label>
                  <Input
                    type="number"
                    value={majEmbouteillage}
                    onChange={(e) =>
                      setMajEmbouteillage(parseFloat(e.target.value))
                    }
                  />
                </div>

                {/* TVA */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">TVA (%)</label>
                  <Input
                    type="number"
                    value={tvaRate}
                    onChange={(e) => setTvaRate(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Surcharge grue */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                <p className="col-span-full font-medium">Surcharge grue</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={surchargeType}
                    onValueChange={(val) =>
                      setSurchargeType(val as "pct" | "fixe")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pct">%</SelectItem>
                      <SelectItem value="fixe">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Montant</label>
                  <Input
                    type="number"
                    value={surchargeValue}
                    onChange={(e) =>
                      setSurchargeValue(parseFloat(e.target.value))
                    }
                  />
                </div>
              </div>

              {/* Autres suppléments dynamiques */}
              <div className="space-y-4 border p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Autres majorations</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setOtherSupps([
                        ...otherSupps,
                        { nom: "", type: "pct", montant: 0 },
                      ])
                    }
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Ajouter
                  </Button>
                </div>

                {otherSupps.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Aucune majoration supplémentaire.
                  </p>
                )}

                {otherSupps.map((supp, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                  >
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm">Nom</label>
                      <Input
                        value={supp.nom}
                        onChange={(e) => {
                          const list = [...otherSupps];
                          list[idx].nom = e.target.value;
                          setOtherSupps(list);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">Type</label>
                      <Select
                        value={supp.type}
                        onValueChange={(val) => {
                          const list = [...otherSupps];
                          list[idx].type = val as "pct" | "fixe";
                          setOtherSupps(list);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pct">%</SelectItem>
                          <SelectItem value="fixe">CHF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex">
                      <Input
                        type="number"
                        value={supp.montant}
                        onChange={(e) => {
                          const list = [...otherSupps];
                          list[idx].montant = parseFloat(e.target.value);
                          setOtherSupps(list);
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setOtherSupps(otherSupps.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !name}
                className="w-full"
              >
                {loading ? "Création..." : "Créer"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
