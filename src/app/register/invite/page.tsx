"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface InvitationData {
  token: string;
  company_name: string;
  invited_by_name: string;
  role: string;
  email: string;
}

function RegisterInviteFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegisterInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null
  );
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

  const invitationToken =
    searchParams.get("token") ||
    (typeof window !== "undefined"
      ? localStorage.getItem("invitation_token")
      : null);

  /**
   * @param Validation du token d'invitation et récupération des données
   */
  const validateInvitation = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/company/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Token d'invitation invalide");
      }

      setInvitationData(data);
    } catch (error) {
      console.error("Erreur validation invitation:", error);
      setError(
        error instanceof Error ? error.message : "Erreur lors de la validation"
      );
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    if (!invitationToken) {
      setError("Token d'invitation manquant");
      setValidating(false);
      return;
    }

    validateInvitation(invitationToken);

    // Définir le flag d'invitation
    if (typeof window !== "undefined") {
      localStorage.setItem("magic_link_invitation", "true");
      localStorage.setItem("invitation_token", invitationToken);
    }
  }, [invitationToken, validateInvitation]);

  // Effet séparé pour vérifier la connexion après que les données d'invitation soient chargées
  useEffect(() => {
    if (!invitationData?.email) return;

    const checkConnection = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        session?.user &&
        session.user.email?.toLowerCase() === invitationData.email.toLowerCase()
      ) {
        setIsAlreadyConnected(true);
        console.log(
          "✅ Utilisateur déjà connecté avec le bon email via magic link"
        );

        // Créer immédiatement l'utilisateur dans la table users pour éviter la boucle useAuth
        try {
          console.log(
            "🔄 Création préventive de l'utilisateur dans la table users..."
          );

          const ensureUserResponse = await fetch("/api/auth/ensure-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: session.user.id,
              firstName: "", // Sera mis à jour lors de la soumission
              lastName: "", // Sera mis à jour lors de la soumission
              invitationToken: invitationToken,
            }),
          });

          if (ensureUserResponse.ok) {
            console.log("✅ Utilisateur créé avec succès dans la table users");
            // Attendre un peu pour que useAuth récupère les nouvelles données
            setTimeout(() => {
              console.log(
                "🔄 Synchronisation session après création utilisateur..."
              );
            }, 1000);
          } else {
            console.log(
              "⚠️ Erreur lors de la création préventive, sera retentée à la soumission"
            );
          }
        } catch (error) {
          console.log("⚠️ Erreur création préventive utilisateur:", error);
        }
      }
    };

    checkConnection();
  }, [invitationData, invitationToken]);

  /**
   * Version ultra-simplifiée : acceptation d'invitation
   */
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation basique
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prénom et nom sont requis");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Finalisation du profil invité...");

      // Vérifier la session (déjà créée par le magic link)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(
          "Session d'invitation expirée. Réouvrez le lien reçu par email."
        );
      }
      console.log("✅ Session OK");

      // 1. Vérifier si l'utilisateur a déjà une company (invitation déjà acceptée)
      console.log("🔍 Vérification du statut utilisateur...");
      const meResponse = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        console.log("🔍 Données utilisateur:", {
          hasUser: !!userData.user,
          hasCompany: !!userData.company,
          company: userData.company?.name,
        });

        if (userData.user && userData.company) {
          console.log(
            "✅ Invitation déjà acceptée, mise à jour mot de passe uniquement"
          );

          // Juste mettre à jour le mot de passe et rediriger
          const { error: passwordError } = await supabase.auth.updateUser({
            password,
          });
          if (passwordError) {
            console.warn(
              "⚠️ Mot de passe non mis à jour:",
              passwordError.message
            );
          } else {
            console.log("✅ Mot de passe mis à jour");
          }

          toast.success("Profil complété ! Bienvenue dans l'équipe !");

          // Nettoyer complètement le localStorage
          console.log("🧹 Nettoyage complet du localStorage...");
          localStorage.removeItem("magic_link_invitation");
          localStorage.removeItem("invitation_token");
          localStorage.removeItem("invitation_completed");

          // Nettoyer aussi les tokens Supabase temporaires
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("sb-") && key.includes("-auth-token")) {
              localStorage.removeItem(key);
            }
          });

          // ⭐ ATTENDRE que useAuth se mette à jour avant redirection
          console.log("🔄 Attente mise à jour useAuth (cas déjà acceptée)...");
          setTimeout(() => {
            console.log("🚀 Redirection vers espace expéditeur");
            router.push("/expediteur");
          }, 2000); // 2 secondes pour que useAuth se mette à jour
          return;
        }
      }

      // 2. Si pas encore d'entreprise, procéder normalement
      console.log("🔄 Mise à jour du mot de passe...");
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });
      if (passwordError) {
        console.warn("⚠️ Mot de passe non mis à jour:", passwordError.message);
      } else {
        console.log("✅ Mot de passe mis à jour");
      }

      // 3. Mettre à jour le profil
      console.log("🔄 Mise à jour du profil...");
      const ensureResponse = await fetch("/api/auth/ensure-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invitationToken,
          firstName,
          lastName,
        }),
      });

      if (!ensureResponse.ok) {
        const errorData = await ensureResponse.json();
        console.error("❌ Erreur ensure-user:", errorData);
        throw new Error(errorData.error || "Erreur mise à jour profil");
      }
      console.log("✅ Profil mis à jour");

      // 4. Accepter l'invitation
      console.log("🔄 Acceptation de l'invitation...");
      const acceptResponse = await fetch("/api/company/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token: invitationToken }),
      });

      if (!acceptResponse.ok) {
        const errorData = await acceptResponse.json();
        console.error("❌ Erreur accept:", errorData);

        // Si déjà membre, c'est OK, rediriger quand même
        if (errorData.error?.includes("déjà membre")) {
          console.log("✅ Déjà membre de l'entreprise, redirection");
        } else {
          throw new Error(errorData.error || "Erreur acceptation invitation");
        }
      } else {
        console.log("✅ Invitation acceptée avec succès !");
      }

      toast.success("Profil complété ! Bienvenue dans l'équipe !");

      // Nettoyer complètement le localStorage
      console.log("🧹 Nettoyage complet du localStorage...");
      localStorage.removeItem("magic_link_invitation");
      localStorage.removeItem("invitation_token");
      localStorage.removeItem("invitation_completed");

      // Nettoyer aussi les tokens Supabase temporaires
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.includes("-auth-token")) {
          localStorage.removeItem(key);
        }
      });

      // ⭐ ATTENDRE que useAuth récupère les nouvelles données company
      console.log("🔄 Attente mise à jour useAuth...");
      setTimeout(() => {
        console.log("🚀 Redirection vers espace expéditeur");
        router.push("/expediteur");
      }, 2000); // 2 secondes pour que useAuth se mette à jour
    } catch (error) {
      console.error("❌ Erreur finalisation:", error);
      const message =
        error instanceof Error ? error.message : "Erreur lors du traitement";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Validation de l&apos;invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Créer votre compte</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre{" "}
            <strong>{invitationData?.company_name}</strong>
          </CardDescription>
          {invitationData?.invited_by_name && (
            <p className="text-sm text-muted-foreground">
              Invité par {invitationData.invited_by_name}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email (pré-rempli, lecture seule) */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={invitationData?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Prénom */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Prénom *</label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                required
                disabled={loading}
              />
            </div>

            {/* Nom */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Nom *</label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
                required
                disabled={loading}
              />
            </div>

            {/* Mot de passe - OBLIGATOIRE pour tous */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Mot de passe *</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Message si déjà connecté */}
            {isAlreadyConnected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Connexion automatique détectée
                    </p>
                    <p className="text-xs text-blue-600">
                      Votre mot de passe sera appliqué à votre compte existant
                      pour sécuriser vos prochaines connexions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isAlreadyConnected
                    ? "Finalisation en cours..."
                    : "Création du compte..."}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isAlreadyConnected
                    ? "Finaliser mon profil"
                    : "Créer mon compte"}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              En créant votre compte, vous rejoignez automatiquement
              l&apos;équipe <strong>{invitationData?.company_name}</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterInvitePage() {
  return (
    <Suspense fallback={<RegisterInviteFallback />}>
      <RegisterInviteContent />
    </Suspense>
  );
}
