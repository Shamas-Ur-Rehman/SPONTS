import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { verifyCompanyRights } from "@/lib/auth-middleware";

/**
 * @param GET - Récupérer les invitations de l'entreprise
 *
 * Liste toutes les invitations de l'entreprise de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification et les droits avec le middleware
    const authResult = await verifyCompanyRights(
      request,
      ["owner", "admin"],
      false
    );
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { membership } = authResult;
    if (!membership) {
      return NextResponse.json(
        { error: "Membership non trouvé" },
        { status: 404 }
      );
    }

    console.log(
      "✅ API invitations GET: Droits vérifiés pour",
      membership.company_id
    );

    // Récupérer les invitations avec supabaseAdmin
    const { data: invitations, error } = await supabaseAdmin
      .from("company_invitations")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur récupération invitations:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * @param POST - Créer une nouvelle invitation
 *
 * Envoie une invitation par email avec un magic link
 */
export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Email et rôle valide requis" },
        { status: 400 }
      );
    }

    // Vérifier l'authentification et les droits avec le middleware
    const authResult = await verifyCompanyRights(
      request,
      ["owner", "admin"],
      true
    );
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user, membership } = authResult;
    if (!membership || !user) {
      return NextResponse.json(
        { error: "Données d'authentification incomplètes" },
        { status: 404 }
      );
    }

    console.log(
      "✅ API invitations POST: Droits vérifiés pour",
      membership.company_id
    );

    // Vérifier si l'utilisateur (par email) est déjà membre de l'entreprise
    // On passe par la table applicative `users` pour retrouver le uid puis vérifier le membership
    const { data: existingAppUser } = await supabaseAdmin
      .from("users")
      .select("uid")
      .eq("email", String(email).toLowerCase().trim())
      .maybeSingle();

    if (existingAppUser?.uid) {
      const { data: existingMembership } = await supabaseAdmin
        .from("company_members")
        .select("id")
        .eq("company_id", membership.company_id)
        .eq("user_id", existingAppUser.uid)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà membre de l'entreprise" },
          { status: 400 }
        );
      }

      // L'utilisateur possède déjà un compte applicatif : ne pas créer d'invitation
      return NextResponse.json(
        {
          error:
            "Cet utilisateur possède déjà un compte. Ajoutez-le directement à l'entreprise (aucune invitation envoyée).",
        },
        { status: 400 }
      );
    }

    // Vérifier si quelqu'un avec cet email n'est pas déjà membre
    // Note: Cette vérification est limitée car on ne peut pas facilement joindre users.email
    // On va s'appuyer sur la vérification au niveau des invitations en attente

    // Vérifier s'il n'y a pas déjà une invitation en attente avec supabaseAdmin
    const { data: existingInvite } = await supabaseAdmin
      .from("company_invitations")
      .select("id")
      .eq("company_id", membership.company_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "Cet utilisateur a déjà une invitation en attente" },
        { status: 400 }
      );
    }

    // Générer un token unique pour l'invitation
    const invitationToken = crypto.randomUUID();

    // Créer l'invitation avec supabaseAdmin
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("company_invitations")
      .insert({
        company_id: membership.company_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        token: invitationToken,
        status: "pending",
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 jours
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Erreur création invitation:", inviteError);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'invitation" },
        { status: 500 }
      );
    }

    console.log("✅ Invitation créée avec token:", {
      invitationId: invitation.id,
      token: invitation.token,
      email: invitation.email,
    });

    // Vérifier si l'utilisateur existe déjà dans Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let emailSent = false;
    let magicLinkActionLink: string | undefined = undefined;

    // Envoi d'email selon le cas (nouvel utilisateur vs utilisateur existant)
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const redirectTo = `${baseUrl}/auth/callback?token=${invitation.token}&type=invite`;
    console.log("📧 Préparation envoi du lien d'invitation...", {
      existingUser: !!existingUser,
      email: email.toLowerCase(),
    });

    if (existingUser) {
      // Utilisateur déjà enregistré dans Supabase Auth → envoyer un magic link de connexion
      const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
          data: {
            invitation_token: invitation.token,
            company_id: membership.company_id,
            role,
            invited_by: user.id,
          },
        },
      });

      if (otpError) {
        console.error(
          "❌ Erreur envoi magic link (utilisateur existant):",
          otpError
        );
        // Fallback: générer un lien manuel de magic link
        const { data: fallbackLink } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: email.toLowerCase(),
            options: {
              redirectTo,
              data: {
                invitation_token: invitation.token,
                company_id: membership.company_id,
                role,
                invited_by: user.id,
              },
            },
          });
        magicLinkActionLink =
          fallbackLink?.properties?.action_link ?? undefined;
        emailSent = false;
      } else {
        emailSent = true;
        console.log("✅ Magic link envoyé (utilisateur existant)");
      }
    } else {
      // Nouvel utilisateur → utiliser inviteUserByEmail
      const { data: linkData, error: magicLinkError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
          redirectTo,
          data: {
            invitation_token: invitation.token,
            company_id: membership.company_id,
            role,
            invited_by: user.id,
          },
        });

      if (magicLinkError) {
        console.error(
          "❌ Erreur envoi email d'invitation (nouvel utilisateur):",
          magicLinkError
        );
        emailSent = false;
        // Fallback: générer un lien d'invitation manuel
        const { data: fallbackLink } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email: email.toLowerCase(),
            options: {
              redirectTo,
              data: {
                invitation_token: invitation.token,
                company_id: membership.company_id,
                role,
                invited_by: user.id,
              },
            },
          });
        magicLinkActionLink =
          fallbackLink?.properties?.action_link ?? undefined;
      } else {
        emailSent = true;
        magicLinkActionLink =
          (
            linkData as unknown as {
              properties?: { action_link?: string } | null;
            } | null
          )?.properties?.action_link ?? undefined;
        console.log("✅ Email d'invitation envoyé (nouvel utilisateur)");
      }
    }

    // Si l'envoi d'email échoue complètement, on peut quand même continuer
    // L'invitation est créée et peut être utilisée manuellement
    if (!emailSent) {
      console.warn("⚠️ Email non envoyé, mais invitation créée");
    }

    return NextResponse.json({
      message: emailSent
        ? "Invitation envoyée avec succès"
        : "Invitation créée avec succès (email non envoyé)",
      invitation,
      emailSent,
      existingUser: !!existingUser,
      // En développement uniquement
      magic_link:
        process.env.NODE_ENV === "development"
          ? magicLinkActionLink
          : undefined,
    });
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * @param DELETE - Révoquer une invitation
 *
 * Annule une invitation en attente
 */
export async function DELETE(request: NextRequest) {
  try {
    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "ID de l'invitation requis" },
        { status: 400 }
      );
    }

    // Vérifier l'authentification et les droits avec le middleware
    const authResult = await verifyCompanyRights(
      request,
      ["owner", "admin"],
      false
    );
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { membership } = authResult;
    if (!membership) {
      return NextResponse.json(
        { error: "Données d'authentification incomplètes" },
        { status: 404 }
      );
    }

    console.log(
      "✅ API invitations DELETE: Droits vérifiés pour",
      membership.company_id
    );

    // Révoquer l'invitation avec supabaseAdmin
    const { error } = await supabaseAdmin
      .from("company_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId)
      .eq("company_id", membership.company_id)
      .eq("status", "pending");

    if (error) {
      console.error("Erreur révocation invitation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la révocation de l'invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Invitation révoquée avec succès",
    });
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
