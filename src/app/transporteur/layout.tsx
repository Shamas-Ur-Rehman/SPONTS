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
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
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
  Package,
  LogOut,
  User2,
  ChevronUp,
  Settings,
  Building2,
  Truck,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/supabase/supabase";

interface TransporteurLayoutProps {
  children: React.ReactNode;
}

export default function TransporteurLayout({
  children,
}: TransporteurLayoutProps) {
  const { user, signOut, isAdmin } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  /**
   * @param Vérification si l'utilisateur est transporteur
   */
  const isTransporteur = user?.user_data?.role === "transporteur";

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
  console.debug("🛠️ [TransporteurLayout] Debug isSpontisAdmin", {
    email: user?.email,
    isSpontisAdmin,
  });

  /**
   * @param Gestion de la déconnexion utilisateur simplifiée
   *
   * Déconnexion directe sans appels Supabase problématiques
   */
  const handleSignOut = async () => {
    console.log(
      "🚪 [TransporteurLayout] Début de la déconnexion simplifiée..."
    );

    try {
      // Nettoyage immédiat des tokens
      console.log("🧹 [TransporteurLayout] Nettoyage des tokens...");
      sessionStorage.removeItem("tempToken");
      sessionStorage.removeItem("temp_token");

      // Nettoyage des tokens Supabase
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.includes("-auth-token")) {
          localStorage.removeItem(key);
        }
      });

      // Tentative de déconnexion Supabase avec timeout
      console.log(
        "🔄 [TransporteurLayout] Tentative de déconnexion Supabase..."
      );
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 2000);
      });

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log("✅ [TransporteurLayout] Déconnexion Supabase réussie");
      } catch {
        console.log(
          "⚠️ [TransporteurLayout] Déconnexion Supabase échouée, continuation..."
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

      console.log("🔄 [TransporteurLayout] Mise à jour de l'état local...");
      await signOut();
    } catch {
      console.error("💥 [TransporteurLayout] Erreur lors de la déconnexion");

      // En cas d'erreur, forcer la redirection
      console.log("🔄 [TransporteurLayout] Redirection forcée...");
      const target = "/login?logout=success";
      router.replace(target);
      setTimeout(() => {
        window.location.assign(target);
      }, 200);
    }
  };

  return (
    <ProtectedRoute
      requiredRole="transporteur"
      requireOnboardingCompleted={true}
      redirectTo="/expediteur"
    >
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <Sidebar collapsible="icon">
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
                        isActive={pathname === "/transporteur/mandats"}
                        tooltip="Marketplace"
                      >
                        <Link href="/transporteur/mandats">
                          <Package />
                          <span>Marketplace</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/transporteur/mesmandats"}
                        tooltip="Mes mandats"
                      >
                        <Link href="/transporteur/mesmandats">
                          <Truck />
                          <span>Mes mandats</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Afficher l'équipe seulement pour les owners */}
                    {isOwner && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === "/transporteur/equipe"}
                          tooltip="Équipe"
                        >
                          <Link href="/transporteur/equipe">
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
                          {user?.user_data?.first_name?.charAt(0) || "Spontis"}
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
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" side="top">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/transporteur/settings"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <User2 className="h-4 w-4" />
                      <span>Mon profil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                    onSelect={() => {
                      console.log(
                        "🖱️ [Transporteur Layout] Bouton déconnexion cliqué !"
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

          <SidebarInset>
            <main className="flex-1 overflow-auto">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
