"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserRole } from "@/types/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Package, Truck, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    role: "transporteur" as UserRole,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp, signIn } = useAuthContext();
  const router = useRouter();

  /**
   * @param Validation des champs du formulaire en temps réel
   *
   * Valide chaque champ selon ses règles spécifiques
   */
  const validateField = (name: string, value: string) => {
    switch (name) {
      case "first_name":
        if (!value.trim()) return "Le prénom est requis";
        if (value.trim().length < 2)
          return "Le prénom doit contenir au moins 2 caractères";
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value.trim()))
          return "Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes";
        break;
      case "last_name":
        if (!value.trim()) return "Le nom est requis";
        if (value.trim().length < 2)
          return "Le nom doit contenir au moins 2 caractères";
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value.trim()))
          return "Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes";
        break;
      case "email":
        if (!value.trim()) return "L'email est requis";

        // Validation plus stricte de l'email
        const emailRegex =
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!emailRegex.test(value.trim())) {
          return "Veuillez entrer une adresse email valide (ex: votre-email@gmail.com)";
        }

        // Avertir pour les emails de test
        if (value.trim().toLowerCase().startsWith("test@")) {
          return "Utilisez votre vraie adresse email plutôt qu'un email de test";
        }

        break;
      case "password":
        if (!value) return "Le mot de passe est requis";
        if (value.length < 6)
          return "Le mot de passe doit contenir au moins 6 caractères";
        break;
      case "confirmPassword":
        if (!value) return "La confirmation du mot de passe est requise";
        if (value !== formData.password)
          return "Les mots de passe ne correspondent pas";
        break;
    }
    return "";
  };

  /**
   * @param Gestion des changements de valeurs des champs
   *
   * Met à jour l'état et valide le champ en temps réel
   */
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Valider le champ en temps réel
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * @param Soumission du formulaire d'inscription
   *
   * Valide tous les champs et appelle la fonction signUp
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valider tous les champs
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);

    // S'il y a des erreurs, ne pas soumettre
    if (Object.keys(newErrors).length > 0) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setLoading(true);

    try {
      const result: any = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
      });

      // Gestion du résultat simplifié
      if (result.needsOnboarding && result.redirectTo) {
        toast.success(
          "Compte créé et connexion réussie ! Redirection vers l'onboarding..."
        );

        // Redirection immédiate - useAuth.signUp() a déjà géré la connexion automatique
        router.push(result.redirectTo);
      } else if (result.needsManualLogin) {
        toast.success(
          "Compte créé avec succès ! Veuillez vous connecter pour continuer."
        );

        // Redirection vers login avec next parameter
        setTimeout(() => {
          const onboardingPath =
            formData.role === "transporteur"
              ? "/onboarding/transporteur"
              : "/onboarding/expediteur";
          router.push(`/login?next=${encodeURIComponent(onboardingPath)}`);
        }, 2000);
      } else {
        toast.success("Compte créé avec succès !");
      }
    } catch (error: unknown) {
      // Gestion d'erreurs spécifiques de Supabase
      if (error instanceof Error) {
        if (error.message?.includes("User already registered")) {
          toast.error("Cette adresse email est déjà utilisée");
        } else if (error.message?.includes("Password should be at least")) {
          toast.error("Le mot de passe doit contenir au moins 6 caractères");
        } else if (
          error.message?.includes("Invalid email") ||
          (error as { code?: string }).code === "email_address_invalid"
        ) {
          toast.error(
            "Format d'adresse email invalide. Veuillez vérifier votre saisie."
          );
        } else if (error.message?.includes("rate_limit")) {
          toast.error("Trop de tentatives. Veuillez réessayer plus tard");
        } else if (error.message?.includes("weak_password")) {
          toast.error("Le mot de passe est trop faible");
        } else {
          toast.error(error.message || "Erreur lors de la création du compte");
        }
      } else {
        toast.error("Erreur lors de la création du compte");
      }

      // En cas d'erreur, rediriger vers le formulaire d'inscription
      setTimeout(() => {
        router.push("/register/transporteur");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-6 w-full max-w-[320px] xs:max-w-[480px] sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl h-full px-1 xs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8",
        className
      )}
      {...props}
    >
      <ThemeToggle />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6 max-w-lg sm:max-w-xl mx-auto w-full border border-border rounded-lg p-4 sm:p-6 bg-card"
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

          {/* Titre avec icône */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Truck className="h-6 w-6 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold">
                Créer un compte Transporteur
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Inscrivez-vous pour transporter des marchandises
            </p>
          </div>

          {/* Champs Prénom et Nom côte à côte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Champ Prénom */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm sm:text-base">
                Prénom *
              </Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Votre prénom"
                className={`h-9 sm:h-10 ${
                  errors.first_name ? "border-red-500 focus:border-red-500" : ""
                }`}
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                required
                autoComplete="given-name"
              />
              {errors.first_name && (
                <span className="text-xs sm:text-sm text-red-500">
                  {errors.first_name}
                </span>
              )}
            </div>
            {/* Champ Nom */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm sm:text-base">
                Nom *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Votre nom"
                className={`h-9 sm:h-10 ${
                  errors.last_name ? "border-red-500 focus:border-red-500" : ""
                }`}
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                required
                autoComplete="family-name"
              />
              {errors.last_name && (
                <span className="text-xs sm:text-sm text-red-500">
                  {errors.last_name}
                </span>
              )}
            </div>
          </div>

          {/* Champ Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">
              Email *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="votre-email@gmail.com"
              className={`h-9 sm:h-10 ${
                errors.email ? "border-red-500 focus:border-red-500" : ""
              }`}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              autoComplete="email"
            />
            {errors.email && (
              <span className="text-xs sm:text-sm text-red-500">
                {errors.email}
              </span>
            )}
          </div>

          {/* Champs Mot de passe côte à côte sur les écrans moyens et plus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Champ Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">
                Mot de passe *
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                className={`h-9 sm:h-10 ${
                  errors.password ? "border-red-500 focus:border-red-500" : ""
                }`}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="text-xs sm:text-sm text-red-500">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Champ Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base">
                Confirmer le mot de passe *
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="********"
                className={`h-9 sm:h-10 ${
                  errors.confirmPassword
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                required
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="text-xs sm:text-sm text-red-500">
                  {errors.confirmPassword}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end pt-3 sm:pt-4">
          <Button
            type="submit"
            className="w-full h-9 sm:h-10 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? "Création..." : "Créer mon compte Transporteur"}
          </Button>
        </div>

        {/* Lien de connexion */}
        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <a
            href="/login"
            className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
          >
            Se connecter
          </a>
        </div>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* Bouton vers formulaire expéditeur */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Vous êtes expéditeur ?
          </p>
          <Button variant="outline" asChild className="w-full">
            <Link
              href="/register/expediteur"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Créer un compte Expéditeur
            </Link>
          </Button>
        </div>

        {/* Message informatif sur la validation */}
        <Alert className="mt-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-xs">
            <strong>Information :</strong> Votre compte sera soumis à validation
            par notre équipe après inscription. Vous recevrez un email de
            confirmation dès qu'il sera approuvé.
          </AlertDescription>
        </Alert>
      </form>
    </div>
  );
}
