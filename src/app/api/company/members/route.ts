import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";

/**
 * @param GET - Récupérer les membres de l'entreprise
 * 
 * Liste tous les membres de l'entreprise de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token d'authentification manquant" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token d'authentification invalide" }, { status: 401 });
    }

    console.log("✅ API members: Utilisateur authentifié:", user.id);

    // Récupérer l'entreprise active de l'utilisateur avec supabaseAdmin
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    console.log("🔍 API members: Recherche membership", { userId: user.id, membership, membershipError });

    if (membershipError || !membership) {
      console.log("❌ API members: Aucune entreprise trouvée pour l'utilisateur", user.id);
      return NextResponse.json(
        { error: "Aucune entreprise associée" },
        { status: 404 }
      );
    }

    // Récupérer tous les membres de l'entreprise
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from("company_members")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("Erreur récupération membres:", membersError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des membres" },
        { status: 500 }
      );
    }

    if (!membersData || membersData.length === 0) {
      return NextResponse.json([]);
    }

    // Récupérer les informations des utilisateurs en parallèle
    const memberPromises = membersData.map(async (member) => {
      try {
        // Essayer d'abord avec la table users personnalisée
        const { data: customUser } = await supabaseAdmin
          .from("users")
          .select("uid, email, first_name, last_name")
          .eq("uid", member.user_id)
          .single();

        if (customUser) {
          return {
            ...member,
            user: {
              id: customUser.uid,
              email: customUser.email,
              first_name: customUser.first_name,
              last_name: customUser.last_name
            }
          };
        }

        // Fallback vers auth.users si pas trouvé dans users
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
        
        return {
          ...member,
          user: authUser?.user ? {
            id: authUser.user.id,
            email: authUser.user.email,
            first_name: authUser.user.user_metadata?.first_name || null,
            last_name: authUser.user.user_metadata?.last_name || null
          } : null
        };
      } catch (error) {
        console.warn(`Impossible de récupérer les données pour l'utilisateur ${member.user_id}:`, error);
        return {
          ...member,
          user: null
        };
      }
    });

    const members = await Promise.all(memberPromises);



    return NextResponse.json(members);
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * @param PATCH - Modifier le rôle d'un membre
 * 
 * Permet de modifier le rôle d'un membre (owner uniquement)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { memberId, role } = await request.json();

    if (!memberId || !role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "ID du membre et rôle valide requis" },
        { status: 400 }
      );
    }

    // Vérification de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token d'authentification manquant" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token d'authentification invalide" }, { status: 401 });
    }

    // Récupérer l'entreprise et vérifier les droits avec supabaseAdmin
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Aucune entreprise associée" },
        { status: 404 }
      );
    }

    // Seul le owner peut modifier les rôles
    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Seul le propriétaire peut modifier les rôles" },
        { status: 403 }
      );
    }

    // Récupérer le membre à modifier
    const { data: targetMember, error: targetError } = await supabase
      .from("company_members")
      .select("role, user_id")
      .eq("id", memberId)
      .eq("company_id", membership.company_id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: "Membre non trouvé" },
        { status: 404 }
      );
    }

    // Empêcher de modifier le rôle d'un owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Impossible de modifier le rôle du propriétaire" },
        { status: 400 }
      );
    }

    // Empêcher de se modifier soi-même
    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: "Impossible de modifier son propre rôle" },
        { status: 400 }
      );
    }

    // Mettre à jour le rôle
    const { data, error } = await supabaseAdmin
      .from("company_members")
      .update({ role })
      .eq("id", memberId)
      .select()
      .single();

    if (error) {
      console.error("Erreur modification rôle:", error);
      return NextResponse.json(
        { error: "Erreur lors de la modification du rôle" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Rôle modifié avec succès",
      member: data,
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
 * @param DELETE - Retirer un membre de l'entreprise
 * 
 * Permet de retirer un membre (owner et admin uniquement)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "ID du membre requis" },
        { status: 400 }
      );
    }

    // Vérification de l'authentification via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token d'authentification manquant" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token d'authentification invalide" }, { status: 401 });
    }

    // Récupérer l'entreprise et vérifier les droits avec supabaseAdmin
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Aucune entreprise associée" },
        { status: 404 }
      );
    }

    // Vérifier les droits
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Droits insuffisants" },
        { status: 403 }
      );
    }

    // Récupérer le membre à supprimer
    const { data: targetMember, error: targetError } = await supabase
      .from("company_members")
      .select("role, user_id")
      .eq("id", memberId)
      .eq("company_id", membership.company_id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: "Membre non trouvé" },
        { status: 404 }
      );
    }

    // Empêcher de supprimer un owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Impossible de retirer le propriétaire" },
        { status: 400 }
      );
    }

    // Un admin ne peut pas supprimer un autre admin
    if (membership.role === "admin" && targetMember.role === "admin") {
      return NextResponse.json(
        { error: "Un administrateur ne peut pas retirer un autre administrateur" },
        { status: 403 }
      );
    }

    // Empêcher de se supprimer soi-même
    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: "Impossible de se retirer soi-même" },
        { status: 400 }
      );
    }

    // Supprimer le membre avec supabaseAdmin
    const { error } = await supabaseAdmin
      .from("company_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Erreur suppression membre:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du membre" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Membre retiré avec succès",
    });
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
