import { useState, useCallback } from "react";
import { CompanyInvitation } from "@/types/company";
import { toast } from "sonner";

export function useCompanyInvitations() {
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);

  /**
   * @param Récupération des invitations de l'entreprise
   * 
   * Charge toutes les invitations envoyées par l'entreprise
   */
  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/company/invitations");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la récupération des invitations");
      }

      const data = await response.json();
      setInvitations(data);
      return data;
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les invitations");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * @param Envoi d'une nouvelle invitation
   * 
   * Crée et envoie une invitation par email avec un magic link
   */
  const sendInvitation = useCallback(async (email: string, role: "admin" | "member") => {
    try {
      setLoading(true);
      const response = await fetch("/api/company/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'invitation");
      }

      toast.success("Invitation envoyée avec succès");
      
      // Rafraîchir la liste des invitations
      await fetchInvitations();
      
      return data;
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi de l'invitation");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  /**
   * @param Révocation d'une invitation
   * 
   * Annule une invitation en attente
   */
  const revokeInvitation = useCallback(async (invitationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/company/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la révocation");
      }

      toast.success("Invitation révoquée");
      
      // Rafraîchir la liste des invitations
      await fetchInvitations();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de révoquer l'invitation");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  /**
   * @param Renvoi d'une invitation
   * 
   * Renvoie une invitation expirée ou révoquée
   */
  const resendInvitation = useCallback(async (email: string, role: "admin" | "member") => {
    try {
      // Pour renvoyer, on crée simplement une nouvelle invitation
      return await sendInvitation(email, role);
    } catch (error) {
      console.error("Erreur:", error);
      throw error;
    }
  }, [sendInvitation]);

  return {
    invitations,
    loading,
    fetchInvitations,
    sendInvitation,
    revokeInvitation,
    resendInvitation,
  };
}
