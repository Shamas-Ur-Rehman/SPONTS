"use client";

import React from "react";
import { CreateMandatWizard } from "@/components/pages/mandats/create-mandat-wizard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Clock, XCircle } from "lucide-react";

export default function CreateMandatPage() {
  const { user } = useAuthContext();

  // Vérifier si l'utilisateur a les permissions dans l'entreprise
  const canCreateMandats =
    user?.company_membership &&
    ["owner", "admin"].includes(user.company_membership.role);

  // Vérifier si l'entreprise est approuvée
  const isCompanyApproved = user?.company?.status === "approved";

  return (
    <ProtectedRoute requiredRole="expediteur">
      {canCreateMandats && isCompanyApproved ? (
        <CreateMandatWizard />
      ) : (
        // Messages d'erreur avec conteneur
        <div className="container mx-auto py-8 px-4">
          {/* Vérification du statut de l'entreprise */}
          {user?.company?.status === "pending" && (
            <Alert className="mb-6 border-border bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                <strong>Validation en cours :</strong> Votre entreprise est en
                cours de validation par notre équipe. Vous pourrez créer des
                mandats une fois votre compte approuvé.
              </AlertDescription>
            </Alert>
          )}

          {user?.company?.status === "rejected" && (
            <Alert className="mb-6 border-destructive/20 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground">
                <strong>Accès refusé :</strong> Votre demande d'inscription a
                été refusée.
                {user.company.rejection_reason && (
                  <> Motif : {user.company.rejection_reason}</>
                )}{" "}
                Contactez notre équipe pour plus d'informations.
              </AlertDescription>
            </Alert>
          )}

          {!isCompanyApproved ? (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                  <CardTitle>Accès temporairement restreint</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  La création de mandats est temporairement désactivée car votre
                  entreprise n'est pas encore approuvée.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                  <CardTitle>Accès restreint</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seuls les administrateurs et propriétaires peuvent créer des
                  mandats. Contactez un administrateur pour obtenir les
                  permissions nécessaires.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
