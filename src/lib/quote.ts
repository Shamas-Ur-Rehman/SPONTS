export interface Variables {
  tarif_km_base_chf: number;
  maj_carburant_pct: number;
  maj_embouteillage_pct: number;
  tva_rate_pct: number;
}

export interface Supplement {
  nom: string;
  type: "pct" | "fix";
  montant: number;
}

export function calculateQuote(
  distanceKm: number,
  surfaceM2: number,
  vars: Variables,
  supplements: Supplement[],
  extrasChf = 0,
  minChargeHt?: number
) {
  const autresPct = supplements
    .filter((s) => s.type === "pct")
    .reduce((t, s) => t + s.montant, 0);
  const autresFix = supplements
    .filter((s) => s.type !== "pct")
    .reduce((t, s) => t + s.montant, 0);

  const gruePct =
    supplements.find(
      (s) => s.nom.toLowerCase().includes("grue") && s.type === "pct"
    )?.montant ?? 0;
  const grueFix =
    supplements.find(
      (s) => s.nom.toLowerCase().includes("grue") && s.type !== "pct"
    )?.montant ?? 0;

  const prixBaseHt = distanceKm * surfaceM2 * vars.tarif_km_base_chf;
  console.log(
    "[Quote] base_ht et distanceKm * surfaceM2 * tarif_km_base_chf",
    distanceKm,
    surfaceM2,
    vars.tarif_km_base_chf,
    prixBaseHt
  );
  const coeffMaj =
    1 + (vars.maj_carburant_pct + vars.maj_embouteillage_pct + autresPct) / 100;
  console.log("[Quote] coeffMaj", coeffMaj);
  const prixApresPct = prixBaseHt * coeffMaj;
  console.log("[Quote] apres_pct", prixApresPct);
  const prixApresFixes = prixApresPct + autresFix + grueFix + extrasChf;
  console.log("[Quote] apres_fixes", prixApresFixes);
  const prixApresGruePct = prixApresFixes * (1 + gruePct / 100);
  console.log("[Quote] apres_grue_pct", prixApresGruePct);
  const prixEstimeHt = Math.max(prixApresGruePct, minChargeHt ?? 0);
  console.log("[Quote] estime_ht", prixEstimeHt);
  const prixEstimeTtc =
    Math.round(prixEstimeHt * (1 + vars.tva_rate_pct / 100) * 100) / 100;
  console.log("[Quote] estime_ttc", prixEstimeTtc);

  return {
    prixBaseHt,
    coeffMaj,
    prixApresPct,
    prixApresFixes,
    prixApresGruePct,
    prixEstimeHt,
    prixEstimeTtc,
  };
}
