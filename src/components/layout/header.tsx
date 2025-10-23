"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
// import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  X,
  Truck,
  User,
  LogOut,
  Settings,
  Home,
  Package,
  Route,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuthContext();

  /**
   * @param Gestion de la déconnexion utilisateur
   *
   * Déconnecte l'utilisateur et redirige vers la page d'accueil
   */
  const logoutRef = useRef(false);

  const handleSignOut = async () => {
    try {
      if (logoutRef.current) return;
      logoutRef.current = true;
      await signOut();
      toast.success("Déconnexion réussie");
      window.location.assign("/login?logout=success");
    } catch (error: unknown) {
      console.error("❌ Erreur lors de la déconnexion:", error);
      console.error("❌ Détails de l'erreur:", {
        message: error instanceof Error ? error.message : "Erreur inconnue",
        stack: error instanceof Error ? error.stack : undefined,
      });

      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la déconnexion"
      );
      window.location.assign("/login?logout=success");
    }
  };

  /**
   * @param Génération des initiales utilisateur
   *
   * Crée les initiales pour l'avatar à partir des données utilisateur
   */
  const getUserInitials = () => {
    if (user?.user_data?.first_name && user?.user_data?.last_name) {
      return `${user.user_data.first_name.charAt(
        0
      )}${user.user_data.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  /**
   * @param Génération des éléments de navigation
   *
   * Retourne les éléments de navigation en fonction du rôle utilisateur
   */
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: "Accueil",
        href: "/",
        icon: Home,
      },
    ];

    // Ajouter "Créer un mandat" uniquement pour les expéditeurs
    if (user?.user_data?.role === "expediteur") {
      baseItems.push({
        name: "Créer un mandat",
        href: "/mandats/create",
        icon: FileText,
      });
    }

    // Ajouter les autres items communs
    baseItems.push(
      {
        name: "Expéditions",
        href: "/expeditions",
        icon: Package,
      },
      {
        name: "Transport",
        href: "/transport",
        icon: Route,
      }
    );

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-16 w-full items-center">
        {/* Logo et nom - Gauche */}
        <div className="flex items-center px-4 md:px-6">
          <Link href="/" className="flex items-center space-x-2 z-10">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">
              Spontis
            </span>
          </Link>
        </div>

        {/* Actions droite - collées au bord */}
        <div className="flex items-center space-x-4 ml-auto px-4 md:px-6 z-10">
          {/* <ThemeToggle /> */}

          {!loading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {user.user_data?.first_name &&
                          user.user_data?.last_name && (
                            <p className="font-medium text-sm">
                              {user.user_data.first_name}{" "}
                              {user.user_data.last_name}
                            </p>
                          )}
                        <p className="w-[200px] truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                        {user.user_data?.role && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {user.user_data.role}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>Profil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Paramètres</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Connexion</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register/expediteur">Inscription</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Menu mobile */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              className="h-9 w-9 px-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation desktop - Centre absolu de l'écran complet */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium absolute left-1/2 transform -translate-x-1/2 top-0 h-16">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center space-x-2 text-foreground/60 transition-colors hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-4">
            {/* Navigation mobile */}
            <nav className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 text-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* Actions mobile - seulement pour les utilisateurs connectés */}
            {!loading && user && (
              <div className="flex flex-col space-y-2 pt-4 border-t border-border/20">
                <Link
                  href="/profile"
                  className="flex items-center space-x-3 text-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Profil</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center space-x-3 text-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  <span>Paramètres</span>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 text-red-600 hover:text-red-700 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
