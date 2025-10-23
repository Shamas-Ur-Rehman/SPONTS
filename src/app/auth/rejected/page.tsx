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
import { XCircle, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

function RejectedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "Aucun motif spécifié";
  const companyName = searchParams.get("company") || "Votre entreprise";

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Demande refusée
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Votre demande d'inscription pour {companyName} a été refusée
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-destructive/20 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground">
                <strong>Motif du refus :</strong>
                <br />
                {reason}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Nous avons examiné votre demande avec attention et regrettons de
                ne pas pouvoir l'approuver pour le moment.
              </p>

              <p>
                Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez
                plus d'informations, n'hésitez pas à nous contacter.
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
                Vous pouvez également créer un nouveau compte avec des
                informations différentes si vous le souhaitez.
              </p>
              <Link
                href="/register/expediteur"
                className="text-primary hover:text-primary/80 underline mt-2 inline-block"
              >
                Créer un nouveau compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RejectedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
          <div>Chargement...</div>
        </div>
      }
    >
      <RejectedContent />
    </Suspense>
  );
}
