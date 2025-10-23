import React from "react";
import Link from "next/link";

/**
 * @param Page 404 personnalisée
 *
 * Affiche un message d'erreur et propose un retour à l'accueil.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background">
      <h1
        className="text-4xl font-bold text-center text-destructive mb-4"
        tabIndex={0}
      >
        Page non trouvée
      </h1>
      <p className="text-lg text-center text-muted-foreground mb-8" tabIndex={0}>
        Oups ! La page que vous cherchez n’existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium shadow transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Retour à l’accueil"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
