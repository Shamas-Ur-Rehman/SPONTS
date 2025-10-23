"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImagePreview({ src, alt, className }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  /**
   * Gère le chargement de l'image
   */
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  /**
   * Gère l'erreur de chargement de l'image
   */
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md",
          className
        )}
      >
        <div className="text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Erreur de chargement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted rounded-md",
            className
          )}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        width={200}
        height={200}
        className={cn(
          "transition-opacity duration-200",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
