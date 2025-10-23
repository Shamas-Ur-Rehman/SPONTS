"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

function AcceptInvitationFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Traitement de votre invitation...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");

  /**
   * @param Acceptation de l'invitation
   *
   * Envoie le token au backend pour accepter l'invitation
   */
  const acceptInvitation = useCallback(
    async (token: string) => {
      try {
        const response = await fetch("/api/company/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Erreur lors de l'acceptation de l'invitation"
          );
        }

        setSuccess(true);
        setCompanyName(data.company?.name || "l'entreprise");
        toast.success("Invitation acceptée avec succès !");

        // Rediriger vers l'espace expéditeur après 2 secondes
        setTimeout(() => {
          router.push("/expediteur");
        }, 2000);
      } catch (error) {
        console.error("Erreur:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'acceptation de l'invitation"
        );
        toast.error("Impossible d'accepter l'invitation");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const token = searchParams.get("token");

    if (authLoading) return;

    if (!token) {
      setError("Token d'invitation manquant");
      setLoading(false);
      return;
    }

    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`
      );
      return;
    }

    acceptInvitation(token);
  }, [searchParams, user, authLoading, router, acceptInvitation]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Traitement de votre invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Erreur</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
            <Button className="w-full mt-4" onClick={() => router.push("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <CardTitle>Invitation acceptée</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Vous avez rejoint {companyName} avec succès !
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              Redirection vers le tableau de bord...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<AcceptInvitationFallback />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
