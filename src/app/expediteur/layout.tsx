"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  FileText,
  CirclePlus,
  LogOut,
  User2,
  ChevronUp,
  Building2,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/supabase/supabase";

interface ExpediteurLayoutProps {
  children: React.ReactNode;
}

const SideBaRIcon = () => {
  const { open, isHovered } = useSidebar();
  return (
    <ChevronUp
      className={`h-4 w-4 text-muted-foreground ${
        open || isHovered ? "" : "hidden"
      }`}
    />
  );
};

export default function ExpediteurLayout({ children }: ExpediteurLayoutProps) {
  const { user, signOut, isAdmin } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * @param Vérification si l'utilisateur est expéditeur
   */
  const isExpediteur = user?.user_data?.role === "expediteur";

  /**
   * @param Vérification si l'utilisateur est owner de l'entreprise
   */
  const isOwner = user?.company_membership?.role === "owner";

  /**
   * @param Vérifie si l'utilisateur fait partie des administrateurs Spontis
   * via la variable d'environnement publique NEXT_PUBLIC_SPONTIS_ADMIN_EMAILS (CSV)
   */
  const isSpontisAdmin = isAdmin(user?.email);

  // Debug
  console.debug("🛠️ [ExpediteurLayout] Debug isSpontisAdmin", {
    email: user?.email,
    isSpontisAdmin,
  });

  /**
   * @param Gestion de la déconnexion utilisateur simplifiée
   *
   * Déconnexion directe sans appels Supabase problématiques
   */
  const handleSignOut = async () => {
    console.log("🚪 [ExpediteurLayout] Début de la déconnexion simplifiée...");

    try {
      // Nettoyage immédiat des tokens
      console.log("🧹 [ExpediteurLayout] Nettoyage des tokens...");
      sessionStorage.removeItem("tempToken");
      sessionStorage.removeItem("temp_token");

      // Nettoyage des tokens Supabase
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.includes("-auth-token")) {
          localStorage.removeItem(key);
        }
      });

      // Tentative de déconnexion Supabase avec timeout
      console.log("🔄 [ExpediteurLayout] Tentative de déconnexion Supabase...");
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 2000);
      });

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log("✅ [ExpediteurLayout] Déconnexion Supabase réussie");
      } catch {
        console.log(
          "⚠️ [ExpediteurLayout] Déconnexion Supabase échouée, continuation..."
        );
      }

      // Redirection immédiate (first) pour donner un feedback instantané
      const target = "/login?logout=success";
      router.replace(target);
      setTimeout(() => {
        window.location.assign(target);
      }, 100);

      // Ensuite, en arrière-plan, on nettoie les sessions/token de façon robuste
      try {
        await fetch("/api/auth/session-clear", { method: "POST" });
      } catch {}

      console.log("🔄 [ExpediteurLayout] Mise à jour de l'état local...");
      await signOut();
    } catch {
      console.error("💥 [ExpediteurLayout] Erreur lors de la déconnexion");

      // En cas d'erreur, forcer la redirection
      console.log("🔄 [ExpediteurLayout] Redirection forcée...");
      const target = "/login?logout=success";
      router.replace(target);
      setTimeout(() => {
        window.location.assign(target);
      }, 200);
    }
  };

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <Sidebar
          collapsible="icon"
          className=" !border-r-0 !border-none rounded-lg bg-sidebar"
        >
          <SidebarHeader>
            <div className="flex justify-center items-center gap-3 px-2 py-2">
              <Image
                src="/logospontis.png"
                alt="Logo de spontis"
                width={17}
                height={24}
                className="text-foreground"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/expediteur/mandats"}
                      tooltip="Tableau de bord"
                    >
                      <Link href="/expediteur/mandats">
                        <Home />
                        <span>Tableau de bord</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* 
                  Afficher les mandats pour les expéditeurs et membres d'entreprise 
                  {(isExpediteur || user?.company_membership) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/expediteur/mandats"}
                        tooltip={
                          user?.company_membership ? "Mandats" : "Mes mandats"
                        }
                      >
                        <Link href="/expediteur/mandats">
                          <FileText />
                          <span>
                            {user?.company_membership
                              ? "Mandats"
                              : "Mes mandats"}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  Nouveau mandat seulement pour les expéditeurs ou admin/owner d'entreprise 
                  {(isExpediteur ||
                    (user?.company_membership &&
                      ["owner", "admin"].includes(
                        user.company_membership.role
                      ))) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/expediteur/mandats/create"}
                        tooltip="Nouveau mandat"
                      >
                        <Link href="/expediteur/mandats/create">
                          <CirclePlus />
                          <span>Nouveau mandat</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  */}

                  {/* Afficher les paramètres seulement pour les owners */}
                  {isOwner && (
                    <SidebarMenuItem className="!justify-left">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/expediteur/equipe"}
                        tooltip="Équipe"
                      >
                        <Link href="/expediteur/equipe">
                          <UserPlus />
                          <span>Équipe</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Lien Administration (visible uniquement pour emails SPONTIS) */}
                  {isSpontisAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/admin"}
                        tooltip="Administration"
                      >
                        <Link href="/admin">
                          <Building2 />
                          <span>Administration</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full h-auto p-2 justify-start"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="Avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {user?.user_data?.first_name?.charAt(0) || "U"}
                        {user?.user_data?.last_name?.charAt(0) || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="text-sm font-medium truncate">
                        {user?.user_data
                          ? `${user.user_data.first_name} ${user.user_data.last_name}`
                          : "Utilisateur"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user?.email || "email@example.com"}
                      </div>
                    </div>
                    <SideBaRIcon />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" side="top">
                <DropdownMenuItem asChild>
                  <Link
                    href="/expediteur/settings"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User2 className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                  onSelect={() => {
                    console.log(
                      "🖱️ [DashboardLayout] Bouton déconnexion cliqué !"
                    );
                    handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4 text-red-600" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
