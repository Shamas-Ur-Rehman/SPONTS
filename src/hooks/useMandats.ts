import { useState, useEffect } from "react";
import { supabase } from "@/supabase/supabase";
import { Mandat } from "@/types/mandat";
import { MandatCreationData } from "@/types/mandat-form";

export function useMandats() {
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupère tous les mandats de l'utilisateur connecté
   */
  const fetchMandats = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Utilisateur non connecté");
        return;
      }

      const { data, error } = await supabase
        .from("mandats")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setMandats(data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des mandats:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée un nouveau mandat
   */
  const createMandat = async (
    mandat: MandatCreationData
  ): Promise<Mandat | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Utilisateur non authentifié");
      }

      const response = await fetch("/api/mandats/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mandat }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création du mandat"
        );
      }

      const result = await response.json();

      if (result.success && result.mandat) {
        // Ajouter le nouveau mandat à la liste
        setMandats((prev) => [result.mandat, ...prev]);
        return result.mandat;
      } else {
        throw new Error(result.error || "Erreur lors de la création du mandat");
      }
    } catch (err) {
      throw err;
    }
  };

  /**
   * Supprime un mandat
   */
  const deleteMandat = async (mandatId: number): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase
        .from("mandats")
        .delete()
        .eq("id", mandatId)
        .eq("created_by", user.id);

      if (error) {
        throw error;
      }

      // Retirer le mandat de la liste
      setMandats((prev) => prev.filter((mandat) => mandat.id !== mandatId));
      return true;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Met à jour un mandat
   */
  const updateMandat = async (
    mandatId: number,
    payload: MandatFormData
  ): Promise<Mandat | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { data, error } = await supabase
        .from("mandats")
        .update({ payload })
        .eq("id", mandatId)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Mettre à jour le mandat dans la liste
      setMandats((prev) =>
        prev.map((mandat) => (mandat.id === mandatId ? data : mandat))
      );

      return data;
    } catch (err) {
      console.error("Erreur lors de la mise à jour du mandat:", err);
      throw err;
    }
  };

  // Charger les mandats au montage du composant
  useEffect(() => {
    fetchMandats();
  }, []);

  return {
    mandats,
    loading,
    error,
    fetchMandats,
    createMandat,
    deleteMandat,
    updateMandat,
  };
}
