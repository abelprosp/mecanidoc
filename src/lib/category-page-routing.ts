/**
 * Mapeamento slug (/categorie/[slug]) → categoria UI (Hero, marques, dimensions, bestsellers).
 * Alinhado ao menu estático (Header STATIC_SUBMENU + slugFromMenuLabel).
 */

export type UiParentCategory = "Auto" | "Moto" | "Camion" | "Tracteurs";

/** Slugs des liens /categorie/… du menu principal (générés comme dans Header). */
export const SLUG_TO_UI_CATEGORY: Record<string, UiParentCategory> = {
  // Auto
  "pneus-4-saisons": "Auto",
  "pneus-4x4suv": "Auto",
  "pneus-camionnette": "Auto",
  "pneus-camping": "Auto",
  "pneus-ete-auto": "Auto",
  "pneus-hiver": "Auto",
  "pneus-voiture": "Auto",
  "pneus-voiture-electrique": "Auto",
  typec: "Auto",
  // Moto
  "chopper-cruiser": "Moto",
  "pneus-circuit-et-piste": "Moto",
  "pneus-cross-enduro-trial": "Moto",
  "pneus-custom-et-collection": "Moto",
  "pneus-moto-sport-et-route": "Moto",
  "pneus-scooter": "Moto",
  "pneus-trail": "Moto",
  "quad-vehicule-tout-terrain": "Moto",
  "sport-tourisme-diagonal": "Moto",
  "sport-tourisme-radial": "Moto",
  // Camion
  "pneus-autocar-autobus": "Camion",
  "pneus-chantier": "Camion",
  "pneus-longue-distance": "Camion",
  "pneus-regionaux": "Camion",
  // Tracteurs
  "pneus-avant-tracteur": "Tracteurs",
  "pneus-espaces-verts": "Tracteurs",
  "pneus-industriel-et-manutention": "Tracteurs",
  "pneus-remorque-agricole": "Tracteurs",
  "pneus-roue-motrice": "Tracteurs",
  tracteurs: "Tracteurs",
};

/**
 * Normalise les valeurs venant de category_pages / menu_subcategories (casse, accents, synonymes).
 */
export function uiCategoryFromDbField(value?: string | null): UiParentCategory | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const n = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n === "moto" || n === "motos") return "Moto";
  if (n === "camion" || n === "camions") return "Camion";
  if (n === "poids lourd" || n === "poids-lourd" || n === "poids lourds") return "Camion";
  if (
    n === "tracteur" ||
    n === "tracteurs" ||
    n === "agricole" ||
    n === "agricoles" ||
    n === "pneus agricoles"
  ) {
    return "Tracteurs";
  }
  if (n === "auto" || n === "automobile" || n === "voiture" || n === "vl" || n === "tourisme") {
    return "Auto";
  }
  return null;
}

/**
 * Infère la catégorie UI à partir du slug seul (fallback si la BD ne renvoie pas product_category_filter).
 * Évite les faux positifs (ex. « camion » dans « camionnette »).
 */
export function uiCategoryFromSlugHeuristic(slug: string): UiParentCategory {
  const s = (slug || "").trim().toLowerCase();
  const fromMap = SLUG_TO_UI_CATEGORY[s];
  if (fromMap) return fromMap;

  if (s.includes("camionnette") || s.includes("camping-car") || s.includes("campingcar")) return "Auto";
  if (s.includes("moto") || s.includes("scooter") || s.includes("quad") || s.includes("trail")) return "Moto";
  if (s.includes("camion") || s.includes("autocar") || s.includes("chantier") || s.includes("regionaux")) {
    return "Camion";
  }
  if (s.includes("agricole") || s.includes("tracteur") || s.includes("remorque") || s.includes("espaces-verts")) {
    return "Tracteurs";
  }
  return "Auto";
}
