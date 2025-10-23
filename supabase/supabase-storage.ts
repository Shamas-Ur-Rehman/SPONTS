import { supabase } from "./supabase";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface ImageUploadOptions {
  file: File;
  userId: string;
  mandatId?: string;
  maxSize?: number; // en MB
}

/**
 * Service pour gérer l'upload d'images vers Supabase Storage
 */
export class SupabaseStorageService {
  private static readonly BUCKET_NAME = "mandats";
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  /**
   * Valide un fichier avant upload
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Vérification du type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.",
      };
    }

    // Vérification de la taille
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Le fichier est trop volumineux. Taille maximale: ${
          this.MAX_FILE_SIZE / (1024 * 1024)
        }MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Génère un nom de fichier unique
   */
  private static generateFileName(
    file: File,
    userId: string,
    mandatId?: string
  ): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();

    if (mandatId) {
      return `${userId}/${mandatId}/${timestamp}-${randomId}.${extension}`;
    }

    return `${userId}/temp/${timestamp}-${randomId}.${extension}`;
  }

  /**
   * Upload une image vers Supabase Storage
   */
  static async uploadImage(options: ImageUploadOptions): Promise<UploadResult> {
    try {
      const { file, userId, mandatId } = options;

      // Validation du fichier
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Génération du nom de fichier
      const fileName = this.generateFileName(file, userId, mandatId);
      const filePath = `${fileName}`;

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("❌ Erreur upload Supabase:", error);
        return {
          success: false,
          error: `Erreur lors de l'upload du fichier: ${error.message}`,
        };
      }

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.error("💥 Erreur upload image:", error);
      return {
        success: false,
        error: `Erreur inattendue lors de l'upload: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      };
    }
  }

  /**
   * Supprime une image de Supabase Storage
   */
  static async deleteImage(
    filePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error("Erreur suppression image:", error);
        return {
          success: false,
          error: "Erreur lors de la suppression du fichier",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Erreur suppression image:", error);
      return {
        success: false,
        error: "Erreur inattendue lors de la suppression",
      };
    }
  }

  /**
   * Nettoie les images temporaires d'un utilisateur
   */
  static async cleanupTempImages(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`${userId}/temp`);

      if (error) {
        console.error("Erreur liste images temp:", error);
        return {
          success: false,
          error: "Erreur lors de la récupération des images temporaires",
        };
      }

      if (data && data.length > 0) {
        const filesToDelete = data.map((file) => `${userId}/temp/${file.name}`);

        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToDelete);

        if (deleteError) {
          console.error("Erreur suppression images temp:", deleteError);
          return {
            success: false,
            error: "Erreur lors de la suppression des images temporaires",
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Erreur nettoyage images temp:", error);
      return {
        success: false,
        error: "Erreur inattendue lors du nettoyage",
      };
    }
  }
}
