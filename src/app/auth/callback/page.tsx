"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Récupérer les paramètres du hash et de l'URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const searchParams = new URLSearchParams(window.location.search);
      const inviteToken = searchParams.get("token");
      const inviteType = searchParams.get("type");

      console.log("🔄 Auth Callback:", {
        hasAccessToken: !!accessToken,
        hasInviteToken: !!inviteToken,
        inviteType,
        hash: window.location.hash,
        search: window.location.search,
      });

      // Attendre que Supabase traite la connexion magic link
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Récupérer la session après le magic link
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Si on a un token d'invitation dans l'URL ou c'est un type invite, c'est prioritaire
      if (inviteToken || inviteType === "invite") {
        console.log("🎯 Token d'invitation ou type invite détecté:", {
          inviteToken,
          inviteType,
        });

        if (session?.user) {
          console.log(
            "✅ Utilisateur connecté via magic link d'invitation:",
            session.user.email
          );

          // Récupérer le token depuis les metadata si pas dans l'URL
          const tokenToUse =
            inviteToken || session.user.user_metadata?.invitation_token;

          if (tokenToUse) {
            // Appeler ensure-user immédiatement pour créer/mettre à jour l'utilisateur
            try {
              console.log("🔄 Appel ensure-user préventif pour invitation...");
              const ensureResponse = await fetch("/api/auth/ensure-user", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  invitationToken: tokenToUse,
                  firstName: session.user.user_metadata?.first_name || "",
                  lastName: session.user.user_metadata?.last_name || "",
                }),
              });

              if (ensureResponse.ok) {
                console.log("✅ ensure-user réussi, vérification du statut...");

                // Vérifier si l'utilisateur existe maintenant dans notre système
                const meResponse = await fetch("/api/auth/me", {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                  },
                });

                if (meResponse.ok) {
                  const userData = await meResponse.json();
                  // Si l'utilisateur existe déjà et a une company, aller à l'espace expéditeur
                  if (userData.user && userData.company) {
                    console.log(
                      "✅ Utilisateur invité déjà configuré, redirection espace expéditeur"
                    );
                    router.replace("/expediteur");
                    return;
                  }
                }
              } else {
                console.warn(
                  "⚠️ ensure-user a échoué:",
                  await ensureResponse.text()
                );
              }
            } catch (error) {
              console.warn("⚠️ Erreur ensure-user:", error);
            }

            localStorage.setItem("magic_link_invitation", "true");
            localStorage.setItem("invitation_token", tokenToUse);

            // Rediriger vers la page de création de compte pour invités
            console.log("🔄 Redirection vers inscription d'invitation");
            router.replace(`/register/invite?token=${tokenToUse}`);
            return;
          }
        } else {
          // Pas de session mais token d'invitation présent, rediriger quand même
          if (inviteToken) {
            localStorage.setItem("invitation_token", inviteToken);
            router.replace(`/register/invite?token=${inviteToken}`);
            return;
          }
        }
      }

      // Vérifier si on a des metadata d'invitation dans la session
      if (session?.user?.user_metadata?.invitation_token) {
        const metaToken = session.user.user_metadata.invitation_token;
        console.log(
          "🎯 Token d'invitation détecté dans user_metadata:",
          metaToken
        );
        localStorage.setItem("invitation_token", metaToken);
        router.replace(`/register/invite?token=${metaToken}`);
        return;
      }

      // À défaut, envoyer vers l'espace expéditeur
      console.log("🔄 Redirection vers espace expéditeur par défaut");
      router.replace("/expediteur");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Traitement"
        />
        <div className="text-lg">Traitement de votre connexion...</div>
      </div>
    </div>
  );
}
