import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/supabase";
import { supabaseAdmin } from "@/supabase/supabase-admin";
import { CreateMandatResponse } from "@/types/mandat";
import { MandatCreationData } from "@/types/mandat-form";
import { calculateQuote } from "@/lib/quote";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 API create mandat - Début");

    // Vérification de l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token d'authentification manquant");
      return NextResponse.json(
        {
          success: false,
          error: "Token d'authentification manquant",
        } as CreateMandatResponse,
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("✅ Token récupéré");

    // Vérification du token avec Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Token invalide:", authError);
      return NextResponse.json(
        {
          success: false,
          error: "Token d'authentification invalide",
        } as CreateMandatResponse,
        { status: 401 }
      );
    }

    console.log("✅ Utilisateur authentifié:", user.id);
    // Note: On ne vérifie plus le rôle dans la table `users`.
    // Le droit de créer un mandat est désormais entièrement contrôlé
    // par le rôle de l'utilisateur dans `company_members` (owner/admin).

    // Récupérer la company active et le rôle (première membership)
    console.log("🏢 Recherche de la company active...");
    const { data: member, error: memberError } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .maybeSingle();

    if (memberError || !member?.company_id) {
      console.log("❌ Aucune company active trouvée", memberError);
      return NextResponse.json(
        {
          success: false,
          error: "Aucune société active trouvée pour l'utilisateur",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    console.log("✅ Company trouvée:", member.company_id);
    console.log("✅ Rôle dans l'entreprise:", member.role);

    // Vérifier les permissions dans l'entreprise
    if (!["owner", "admin"].includes(member.role)) {
      console.log(
        "❌ Permissions insuffisantes dans l'entreprise:",
        member.role
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Seuls les administrateurs et propriétaires peuvent créer des mandats",
        } as CreateMandatResponse,
        { status: 403 }
      );
    }

    // Récupération des données du mandat
    console.log("🔄 Récupération des données du mandat...");
    const body = await request.json();
    const mandat: MandatCreationData | undefined = body.mandat;

    if (!mandat) {
      console.log("❌ Données du mandat manquantes");
      return NextResponse.json(
        {
          success: false,
          error: "Données du mandat manquantes",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    console.log("✅ Données du mandat reçues:", mandat);

    // Validation des données requises
    console.log("🔄 Validation des données...");
    if (!mandat.nom?.trim()) {
      console.log("❌ Nom du mandat manquant");
      return NextResponse.json(
        {
          success: false,
          error: "Le nom du mandat est requis",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (!mandat.description?.trim()) {
      console.log("❌ Description du mandat manquante");
      return NextResponse.json(
        {
          success: false,
          error: "La description du mandat est requise",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (!mandat.depart_adresse?.adresse?.trim()) {
      console.log("❌ Adresse de départ manquante");
      return NextResponse.json(
        {
          success: false,
          error: "L'adresse de départ est requise",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (!mandat.arrivee_adresse?.adresse?.trim()) {
      console.log("❌ Adresse d'arrivée manquante");
      return NextResponse.json(
        {
          success: false,
          error: "L'adresse d'arrivée est requise",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (!mandat.enlevement_souhaite_debut_at) {
      console.log("❌ Heure de début d'enlèvement manquante");
      return NextResponse.json(
        {
          success: false,
          error: "L'heure de début d'enlèvement est requise",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (!mandat.enlevement_souhaite_fin_at) {
      console.log("❌ Heure de fin d'enlèvement manquante");
      return NextResponse.json(
        {
          success: false,
          error: "L'heure de fin d'enlèvement est requise",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    console.log("✅ Validation des données réussie");

    // Validation des dates/heures (doivent être dans le futur et cohérentes)
    const debutDate = new Date(mandat.enlevement_souhaite_debut_at);
    const finDate = new Date(mandat.enlevement_souhaite_fin_at);
    const now = new Date();

    if (debutDate <= now) {
      console.log("❌ Date de début dans le passé:", debutDate, "vs", now);
      return NextResponse.json(
        {
          success: false,
          error: "L'heure de début d'enlèvement doit être dans le futur",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    if (finDate <= debutDate) {
      console.log(
        "❌ Date de fin antérieure au début:",
        finDate,
        "vs",
        debutDate
      );
      return NextResponse.json(
        {
          success: false,
          error: "L'heure de fin doit être postérieure au début",
        } as CreateMandatResponse,
        { status: 400 }
      );
    }

    console.log("✅ Validation de l'heure réussie");

    // Récupérer le pricing actif
    console.log("🔄 Recherche du pricing actif...");
    const { data: activePricing } = await supabaseAdmin
      .from("pricing_sets")
      .select("id, variables, supplements")
      .eq("is_active", true)
      .maybeSingle();

    if (!activePricing) {
      console.log("❌ Aucun pricing actif");
      return NextResponse.json(
        {
          success: false,
          error: "Aucun modèle de pricing actif. Contactez l'administrateur.",
        } as CreateMandatResponse,
        { status: 500 }
      );
    }

    const vars = activePricing.variables || {};
    const supps: any[] = activePricing.supplements || [];

    // Extraire surcharge grue
    const grue = supps.find((s) => s.nom?.toLowerCase().includes("grue"));

    // Calcul distance & durée via Google Distance Matrix
    let distanceKm: number | null = null;
    let dureeMin: number | null = null;
    if (
      mandat.depart_adresse?.lat &&
      mandat.depart_adresse?.lng &&
      mandat.arrivee_adresse?.lat &&
      mandat.arrivee_adresse?.lng &&
      GOOGLE_API_KEY
    ) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${mandat.depart_adresse.lat},${mandat.depart_adresse.lng}&destinations=${mandat.arrivee_adresse.lat},${mandat.arrivee_adresse.lng}&key=${GOOGLE_API_KEY}`;

        const gmRes = await fetch(url);
        const gmJson = await gmRes.json();
        if (
          gmJson.status === "OK" &&
          gmJson.rows?.[0]?.elements?.[0]?.status === "OK"
        ) {
          const elem = gmJson.rows[0].elements[0];
          distanceKm = elem.distance.value / 1000; // mètres -> km
          dureeMin = Math.round(elem.duration.value / 60); // secondes -> min
        }
      } catch (e) {
        console.error("Erreur appel Google Distance Matrix", e);
      }
    }

    // Calcul devis backend
    const quoteRes = calculateQuote(
      distanceKm || 0,
      mandat.surface_m2 || 0,
      vars as any,
      supps as any
    );

    /**
     * Création du mandat dans la base de données avec supabaseAdmin
     * pour contourner les politiques RLS
     */
    console.log("🔄 Création du mandat dans la base de données...");
    const insertData = {
      uid: user.id, // Champ obligatoire (référence auth.users)
      company_id: member.company_id,
      created_by: user.id,
      status: "pending",
      nom: mandat.nom,
      description: mandat.description,
      images: mandat.images,
      depart_adresse: mandat.depart_adresse.adresse,
      depart_lat: mandat.depart_adresse.lat,
      depart_lng: mandat.depart_adresse.lng,
      depart_contact: mandat.depart_contact,
      arrivee_adresse: mandat.arrivee_adresse.adresse,
      arrivee_lat: mandat.arrivee_adresse.lat,
      arrivee_lng: mandat.arrivee_adresse.lng,
      arrivee_contact: mandat.arrivee_contact,
      depart_horaires_ouverture: mandat.depart_horaires_ouverture,
      arrivee_horaires_ouverture: mandat.arrivee_horaires_ouverture,
      enlevement_souhaite_debut_at: mandat.enlevement_souhaite_debut_at,
      enlevement_souhaite_fin_at: mandat.enlevement_souhaite_fin_at,
      type_marchandise: mandat.type_marchandise,
      poids_total_kg: mandat.poids_total_kg,
      volume_total_m3: mandat.volume_total_m3,
      surface_m2: mandat.surface_m2,
      nombre_colis: mandat.nombre_colis,
      type_vehicule: mandat.type_vehicule,
      type_acces: mandat.type_acces,
      acces_autre: mandat.acces_autre,
      moyen_chargement: mandat.moyen_chargement,
      sensi_temperature: mandat.sensi_temperature,
      temperature_min_c: mandat.temperature_min_c,
      temperature_max_c: mandat.temperature_max_c,
      matiere_dangereuse: mandat.matiere_dangereuse,
      adr_classe: mandat.adr_classe,
      adr_uno: mandat.adr_uno,

      // Pricing pré-rempli
      tarif_km_base_chf: vars.tarif_km_base_chf,
      maj_carburant_pct: vars.maj_carburant_pct,
      maj_embouteillage_pct: vars.maj_embouteillage_pct,
      tva_rate_pct: vars.tva_rate_pct,
      autre_supp: JSON.stringify(supps),
      surcharge_grue_pct: grue && grue.type === "pct" ? grue.montant : null,
      surcharge_grue_chf: grue && grue.type !== "pct" ? grue.montant : null,

      distance_km: distanceKm,
      duree_estimee_min: dureeMin,
      prix_base_ht: quoteRes.prixBaseHt,
      prix_estime_ht: quoteRes.prixEstimeHt,
      prix_estime_ttc: quoteRes.prixEstimeTtc,
      monnaie: "CHF",

      payload: mandat, // copie JSON pour compat retro
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("mandats")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.log("❌ Erreur insertion mandat:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message } as CreateMandatResponse,
        { status: 500 }
      );
    }

    console.log("✅ Mandat inséré", inserted.id);

    return NextResponse.json<CreateMandatResponse>({
      success: true,
      mandat: inserted as any,
    });
  } catch (error) {
    console.error("💥 Erreur création mandat:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Erreur interne du serveur: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      } as CreateMandatResponse,
      { status: 500 }
    );
  }
}
