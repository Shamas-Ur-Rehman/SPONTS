"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail, X, Shield, Users, Truck } from "lucide-react";
import { CompanyInvitation, CompanyMember } from "@/types/company";

export default function EquipeTransporteurPage() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [newInvite, setNewInvite] = useState({ email: "", role: "member" });
  const [activeTab, setActiveTab] = useState("members");

  /**
   * @param Récupération des membres de l'entreprise
   *
   * Charge la liste des membres actuels de l'entreprise
   */
  const fetchMembers = async () => {
    try {
      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/company/members", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!response.ok)
        throw new Error("Erreur lors de la récupération des membres");

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les membres");
    }
  };

  /**
   * @param Récupération des invitations en attente
   *
   * Charge la liste des invitations envoyées
   */
  const fetchInvitations = async () => {
    try {
      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/company/invitations", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!response.ok)
        throw new Error("Erreur lors de la récupération des invitations");

      const data = await response.json();
      setInvitations(data);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les invitations");
    }
  };

  /**
   * @param Envoi d'une nouvelle invitation
   *
   * Envoie une invitation par email avec magic link
   */
  const handleSendInvitation = async () => {
    if (!newInvite.email.trim()) {
      toast.error("Veuillez saisir un email");
      return;
    }

    setLoading(true);
    try {
      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/company/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(newInvite),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'invitation");
      }

      // Message adapté selon si l'email a été envoyé
      if (data.emailSent) {
        toast.success(
          data.existingUser
            ? "Invitation envoyée ! Magic link généré pour l'utilisateur existant."
            : "Invitation envoyée par email avec succès !"
        );
      } else {
        toast.warning(
          "Invitation créée mais email non envoyé. " +
            (data.magic_link ? "Consultez les logs pour le magic link." : "")
        );
      }

      setNewInvite({ email: "", role: "member" });
      await fetchInvitations();
    } catch (error: any) {
      console.error("Erreur invitation:", error);
      toast.error(error.message || "Erreur lors de l'envoi de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param Suppression d'un membre
   *
   * Retire un membre de l'entreprise (sauf le propriétaire)
   */
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ?")) return;

    try {
      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/company/members", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      toast.success("Membre retiré avec succès");
      await fetchMembers();
    } catch (error: any) {
      console.error("Erreur suppression membre:", error);
      toast.error(error.message || "Erreur lors de la suppression du membre");
    }
  };

  /**
   * @param Révocation d'une invitation
   *
   * Annule une invitation en attente
   */
  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette invitation ?"))
      return;

    try {
      // Récupérer le token de session courant depuis Supabase
      const { supabase } = await import("@/supabase/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/company/invitations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la révocation");
      }

      toast.success("Invitation révoquée");
      await fetchInvitations();
    } catch (error: any) {
      console.error("Erreur révocation:", error);
      toast.error(error.message || "Erreur lors de la révocation");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.company) return;

      setLoadingData(true);
      await Promise.all([fetchMembers(), fetchInvitations()]);
      setLoadingData(false);
    };

    loadData();
  }, [user]);

  if (!user || user.company_membership?.role !== "owner") {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Équipe</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <p>
              Accès refusé. Seuls les propriétaires peuvent accéder à la gestion
              de l&apos;équipe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-2">
        <SidebarTrigger />
        <h2 className="text-3xl font-bold tracking-tight">Équipe</h2>
      </div>

      {/* Navigation par onglets simplifiée */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <Button
          variant={activeTab === "members" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setActiveTab("members")}
        >
          <Users className="mr-2 h-4 w-4" />
          Membres
        </Button>
        <Button
          variant={activeTab === "invitations" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setActiveTab("invitations")}
        >
          <Mail className="mr-2 h-4 w-4" />
          Invitations
        </Button>
      </div>

      {loadingData ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Chargement...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Onglet Membres */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Nouvelle invitation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Inviter un nouveau transporteur
                  </CardTitle>
                  <CardDescription>
                    Invitez des transporteurs à rejoindre votre entreprise pour
                    gérer les mandats ensemble
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="email">Adresse email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="transporteur@exemple.com"
                        value={newInvite.email}
                        onChange={(e) =>
                          setNewInvite((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle</Label>
                      <select
                        id="role"
                        value={newInvite.role}
                        onChange={(e) =>
                          setNewInvite((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="member">Disponant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendInvitation}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Envoyer l&apos;invitation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Liste des membres */}
              <Card>
                <CardHeader>
                  <CardTitle>Membres actuels</CardTitle>
                  <CardDescription>
                    {members.length} disponant{members.length > 1 ? "s" : ""}{" "}
                    dans votre entreprise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user?.first_name && member.user?.last_name
                                ? `${member.user.first_name} ${member.user.last_name}`
                                : member.user?.email ||
                                  `Disponant #${member.id.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Rejoint le{" "}
                              {new Date(member.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              member.role === "owner"
                                ? "default"
                                : member.role === "admin"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {member.role === "owner" ? (
                              <>
                                <Shield className="mr-1 h-3 w-3" />
                                Propriétaire
                              </>
                            ) : member.role === "admin" ? (
                              "Admin"
                            ) : (
                              "Disponant"
                            )}
                          </Badge>
                          {member.role !== "owner" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Onglet Invitations */}
          {activeTab === "invitations" && (
            <Card>
              <CardHeader>
                <CardTitle>Invitations en attente</CardTitle>
                <CardDescription>
                  {invitations.length} invitation
                  {invitations.length > 1 ? "s" : ""} en cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      Aucune invitation en attente
                    </p>
                  ) : (
                    invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invité le{" "}
                              {new Date(
                                invitation.created_at
                              ).toLocaleDateString()}
                              {invitation.expires_at &&
                                ` • Expire le ${new Date(
                                  invitation.expires_at
                                ).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              invitation.status === "pending"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {invitation.status === "pending"
                              ? "En attente"
                              : invitation.status}
                          </Badge>
                          <Badge variant="outline">
                            {invitation.role === "admin"
                              ? "Admin"
                              : "Disponant"}
                          </Badge>
                          {invitation.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRevokeInvitation(invitation.id)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
