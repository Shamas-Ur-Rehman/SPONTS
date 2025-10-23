"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

function PendingContent() {
  const searchParams = useSearchParams();
  const companyName = searchParams.get("company") || "Votre entreprise";

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Validation en cours
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Votre demande d'inscription pour {companyName} est en cours
              d'examen
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-border bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-foreground">
                <strong>Statut :</strong> En attente de validation par notre
                équipe
              </AlertDescription>
            </Alert>

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Nous avons bien reçu votre demande d'inscription et notre équipe
                l'examine actuellement. Ce processus prend généralement 24 à 48
                heures.
              </p>

              <p>
                Vous recevrez un email dès que votre compte sera validé ou si
                nous avons besoin d'informations supplémentaires.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full" variant="outline">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </Button>

              <Button asChild className="w-full" variant="outline">
                <Link
                  href="mailto:support@spontis.com"
                  className="flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contacter le support
                </Link>
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
              <p>
                En attendant, vous pouvez consulter notre documentation ou nous
                contacter pour toute question.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
          <div>Chargement...</div>
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
