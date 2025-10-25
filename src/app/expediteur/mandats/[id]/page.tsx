"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Mandat } from "@/types/mandat";
import Link from "next/link";
import { MandatContent } from "@/components/pages/mandats/MandatContent";
import { IoDocumentTextOutline } from "react-icons/io5";

export default function MandatDetailPage() {
  const { handleTokenExpiration } = useAuth();
  const params = useParams();
  const [mandat, setMandat] = useState<Mandat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mandatId = params.id as string;

  const fetchMandatDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/mandats/${mandatId}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        await handleTokenExpiration(
          "Session expirée lors du chargement du mandat"
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erreur lors du chargement du mandat");
      }

      setMandat(result.mandat);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("401") ||
          err.message.includes("403") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Forbidden"))
      ) {
        await handleTokenExpiration(
          "Erreur d'authentification lors du chargement du mandat"
        );
        return;
      }

      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [mandatId, handleTokenExpiration]);

  useEffect(() => {
    if (mandatId) {
      fetchMandatDetails();
    }
  }, [mandatId, fetchMandatDetails]);

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <Skeleton className="h-6 w-32" />
        </div>
        <main className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !mandat) {
    return (
      <>
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="font-medium">Détail du mandat</div>
        </div>
        <main className="p-6">
          <Alert className="border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-foreground">
              <strong>Erreur :</strong> {error || "Mandat introuvable"}
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Link href="/expediteur/mandats">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux mandats
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-border py-5 px-5 text-sm text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-10">
            <p>Mentions légales</p>
            <p>Support</p>
          </div>
          <p>© 2025 Revers0. Tous droits réservés.</p>
        </footer>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        {/* <SidebarTrigger /> */}
        {/* <Separator orientation="vertical" className="h-6" /> */}
        <div className="flex items-center gap-2">
          <Link href="/expediteur/mandats">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <IoDocumentTextOutline className="h-4 w-4" />
              <span>Mes mandats </span>
            </Button>
          </Link>

          <span className="font-medium text-[#186BB0]">
            Transport Rapide - Lausanne
          </span>

          <img
            src="/Badge.png"
            alt="Livré"
            className="h-10 w-10 object-contain"
          />
        </div>
      </div>

      <main className="p-6">
        <MandatContent mandat={mandat} />
      </main>

      {/* Footer */}
       <footer className="border-t border-border py-6 px-8 text-sm text-muted-foreground flex items-center justify-between">
        <p>© 2025 Revers0. Tous droits réservés.</p>
        <div className="flex items-center gap-8">
          <p>Mentions légales</p>
          <p>Support</p>
        </div>
      </footer>
    </>
  );
}
