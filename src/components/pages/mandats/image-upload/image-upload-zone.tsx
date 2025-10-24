"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react"; // Upload icon remove kar diya, kyunki custom image use kar rahe hain
import { cn } from "@/lib/utils";
import { ImagePreview } from "./image-preview";
import { supabase } from "@/supabase/supabase";

interface ImageUploadZoneProps {
  onImagesChange: (imageUrls: string[]) => void;
  currentImages: string[];
  maxImages?: number;
  maxFileSize?: number; // en MB
}

export function ImageUploadZone({
  onImagesChange,
  currentImages,
  maxImages = 5,
  maxFileSize = 5,
}: ImageUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  /**
   * Valide le type et la taille du fichier
   */
  const validateFile = useCallback(
    (file: File): boolean => {
      // Validation du type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.");
        return false;
      }

      // Validation de la taille
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        alert(
          `Le fichier est trop volumineux. Taille maximale: ${maxFileSize}MB`
        );
        return false;
      }

      return true;
    },
    [maxFileSize]
  );

  /**
   * Gère l'upload d'un fichier vers Supabase Storage
   */
  const handleFileUpload = useCallback(async (file: File): Promise<string> => {
    try {
      // Récupération de la session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Utilisateur non authentifié");
      }

      // Génération du nom de fichier
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split(".").pop();
      const fileName = `${session.user.id}/temp/${timestamp}-${randomId}.${extension}`;

      // Upload direct vers Supabase Storage
      const { error } = await supabase.storage
        .from("mandats")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("❌ Erreur upload Supabase:", error);
        throw new Error(`Erreur lors de l'upload: ${error.message}`);
      }

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from("mandats")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("❌ Erreur upload fichier:", error);
      throw error;
    }
  }, []);

  /**
   * Traite les fichiers sélectionnés
   */
  const processFiles = useCallback(
    async (files: FileList) => {
      const validFiles = Array.from(files).filter(validateFile);

      if (validFiles.length === 0) return;

      // Vérification du nombre maximum d'images
      if (currentImages.length + validFiles.length > maxImages) {
        alert(
          `Vous ne pouvez pas ajouter plus de ${maxImages} images au total.`
        );
        return;
      }

      // Upload des fichiers
      const uploadPromises = validFiles.map(async (file) => {
        try {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 0,
          }));

          const imageUrl = await handleFileUpload(file);

          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 100,
          }));

          return imageUrl;
        } catch (error) {
          console.error(`❌ Erreur upload ${file.name}:`, error);
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter(
        (url) => url !== null
      ) as string[];

      if (successfulUrls.length > 0) {
        onImagesChange([...currentImages, ...successfulUrls]);
      }
    },
    [currentImages, maxImages, onImagesChange, validateFile, handleFileUpload]
  );

  /**
   * Gère le drop de fichiers
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  /**
   * Gère le drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  /**
   * Gère le drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Gère la sélection de fichiers via input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset l'input
    e.target.value = "";
  };

  /**
   * Supprime une image
   */
  const handleRemoveImage = (index: number) => {
    const newImages = currentImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center gap-3">
          {/* Yahan apni custom icon image lagayein */}
          <img
            src="/upload.png"  // Yeh apni image ke naam se change karein, e.g., /your-icon-name.png
            alt="Upload Icon"
            className="h-8 w-8"
          />

          <p className="text-sm" style={{ color: '#6A7282' }}>
            Glissez-déposez vos images ici ou <br />
            (Taille maximale : 30 Mo)
          </p>

          <Button
            type="button"
            className="bg-[#186BB0] text-white hover:bg-[#145a96]"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            + Ajouter un fichier
          </Button>
        </div>

        <input
          id="file-input"
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Prévisualisation des images */}
      {currentImages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Images sélectionnées</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <ImagePreview
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />

                {/* Bouton de suppression */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
