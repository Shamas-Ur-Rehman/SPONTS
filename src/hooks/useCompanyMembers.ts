import { useState, useCallback } from "react";
import { CompanyMember } from "@/types/company";
import { toast } from "sonner";

export function useCompanyMembers() {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);

  /**
   * @param Récupération des membres de l'entreprise
   * 
   * Charge tous les membres de l'entreprise
   */
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/company/members");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la récupération des membres");
      }

      const data = await response.json();
      setMembers(data);
      return data;
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les membres");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * @param Modification du rôle d'un membre
   * 
   * Change le rôle d'un membre (admin ou member)
   */
  const updateMemberRole = useCallback(async (memberId: string, role: "admin" | "member") => {
    try {
      setLoading(true);
      const response = await fetch("/api/company/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la modification du rôle");
      }

      toast.success("Rôle modifié avec succès");
      
      // Rafraîchir la liste des membres
      await fetchMembers();
      
      return data;
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la modification du rôle");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchMembers]);

  /**
   * @param Suppression d'un membre
   * 
   * Retire un membre de l'entreprise
   */
  const removeMember = useCallback(async (memberId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/company/members?id=${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast.success("Membre retiré de l'entreprise");
      
      // Rafraîchir la liste des membres
      await fetchMembers();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de retirer le membre");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchMembers]);

  /**
   * @param Vérification des permissions
   * 
   * Vérifie si l'utilisateur actuel peut gérer les membres
   */
  const canManageMembers = useCallback((userRole?: string) => {
    return userRole === "owner" || userRole === "admin";
  }, []);

  /**
   * @param Vérification des permissions owner
   * 
   * Vérifie si l'utilisateur actuel est owner
   */
  const isOwner = useCallback((userRole?: string) => {
    return userRole === "owner";
  }, []);

  return {
    members,
    loading,
    fetchMembers,
    updateMemberRole,
    removeMember,
    canManageMembers,
    isOwner,
  };
}
