"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { signIn, signOut } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dédoublonnage StrictMode: refs pour s'assurer que chaque toast s'affiche une seule fois
  const logoutToastShownRef = useRef(false);

  /**
   * @param Pré-remplissage de l'email depuis les paramètres de query
   *
   * Permet de pré-remplir l'email quand l'utilisateur arrive depuis l'inscription
   */
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setFormData((prev) => ({
        ...prev,
        email: emailParam,
      }));
    }
  }, [searchParams]);

  // Affichage du toast de succès après déconnexion (une seule fois)
  useEffect(() => {
    const logoutParam = searchParams.get("logout");
    if (logoutParam === "success" && !logoutToastShownRef.current) {
      logoutToastShownRef.current = true;
      toast.success(
        "Déconnexion réussie ! Vous avez été déconnecté avec succès.",
        { duration: 3000 }
      );
      // Nettoyer l'URL pour éviter un deuxième toast (StrictMode / navigations)
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("logout");
        window.history.replaceState({}, "", url.toString());
      } catch {}
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Connexion simple - useAuth.signIn() gère maintenant toute la logique
      await signIn(formData);

      toast.success("Connexion réussie !");

      // Redirection vers la page visée si fournie
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      if (next) {
        window.location.href = next;
        return;
      }

      // Laisser RedirectIfAuthenticated gérer la redirection vers le dashboard
    } catch (error: unknown) {
      // Gestion d'erreurs génériques
      if (error instanceof Error) {
        toast.error(error.message || "Erreur de connexion");
      } else {
        toast.error("Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-6 w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm md:max-w-md lg:max-w-lg h-full px-1 xs:px-2 sm:px-3 md:px-4 lg:px-6",
        className
      )}
      {...props}
    >
      <ThemeToggle />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6 max-w-sm sm:max-w-md mx-auto w-full border border-border rounded-lg p-4 sm:p-6 bg-card"
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Bouton de retour */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="p-2 h-auto w-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm">Retour</span>
          </Button>

          <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">
            Connexion
          </h2>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              className="h-9 sm:h-10"
            />
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm sm:text-base">
                Mot de passe *
              </Label>
              <a
                href="#"
                className="text-xs sm:text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-primary transition-colors"
              >
                Mot de passe oublié ?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              required
              className="h-9 sm:h-10"
            />
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end pt-3 sm:pt-4">
          <Button
            type="submit"
            className="w-full h-9 sm:h-10 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Connexion en cours...</span>
              </div>
            ) : (
              "Se connecter"
            )}
          </Button>
        </div>

        {/* Lien d'inscription */}
        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          Vous n&apos;avez pas de compte ?{" "}
          <a
            href="/register/expediteur"
            className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
          >
            Créer un compte
          </a>
        </div>

        {/* Message informatif sur la validation */}
        <Alert className="mt-4 border-border bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground text-xs">
            <strong>Information :</strong> Les nouveaux comptes sont soumis à
            validation par notre équipe. Vous recevrez un email de confirmation
            dès que votre compte sera approuvé.
          </AlertDescription>
        </Alert>
      </form>
    </div>
  );
}
