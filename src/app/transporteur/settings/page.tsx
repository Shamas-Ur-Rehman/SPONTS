"use client";

import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  User,
  Mail,
  MapPin,
  Truck,
  AlertCircle,
} from "lucide-react";

export default function TransporteurSettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="font-medium">Paramètres</div>
      </div>

      <main className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Paramètres
          </h1>
          <p className="text-muted-foreground">
            Gérez les paramètres de votre compte transporteur
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations de l'entreprise */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations de l'entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nom de l'entreprise</span>
                <span className="text-sm text-muted-foreground">
                  {user?.company?.name || "Non renseigné"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut</span>
                <Badge
                  variant={
                    user?.company?.status === "approved"
                      ? "default"
                      : "secondary"
                  }
                >
                  {user?.company?.status === "approved"
                    ? "Approuvé"
                    : "En attente"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type</span>
                <Badge variant="outline">
                  <Truck className="h-3 w-3 mr-1" />
                  Transporteur
                </Badge>
              </div>

              {user?.company?.status === "pending" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Votre entreprise est en attente de validation par nos
                    administrateurs. Vous pourrez accepter des mandats une fois
                    votre compte approuvé.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nom complet</span>
                <span className="text-sm text-muted-foreground">
                  {user?.user_data?.first_name || "Prénom manquant"}
                  {user?.user_data?.last_name || "Nom de famille manquant"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email</span>
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rôle</span>
                <Badge variant="outline">Transporteur</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Informations de facturation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Informations de facturation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Email de facturation
                </span>
                <span className="text-sm text-muted-foreground">
                  {user?.company?.billing_email || "Non renseigné"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Numéro de TVA</span>
                <span className="text-sm text-muted-foreground">
                  {user?.company?.vat_number || "Non renseigné"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Numéro RCS</span>
                <span className="text-sm text-muted-foreground">
                  {user?.company?.rcs || "Non renseigné"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {user?.company?.billing_address ? (
                  <div className="space-y-2">
                    <p>
                      {[
                        user.company.billing_address.street,
                        [
                          user.company.billing_address.postal_code,
                          user.company.billing_address.city,
                        ]
                          .filter(Boolean)
                          .join(" "),
                        user.company.billing_address.country,
                      ]
                        .filter((part) => Boolean(part && String(part).trim()))
                        .join(", ") || "Adresse non renseignée"}
                    </p>
                  </div>
                ) : (
                  "Adresse non renseignée"
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
