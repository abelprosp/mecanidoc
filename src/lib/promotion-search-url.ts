import { uiCategoryFromDbField } from "@/lib/category-page-routing";

/**
 * Lien vers la page de filtres (/search) pré-remplie selon la promotion.
 * - Catégorie : parent_category (Auto, Moto, …) ou « Toutes » si bandeau général.
 * - promo_id : pour afficher le contexte promo sur la page recherche.
 */
export function buildPromotionSearchHref(p: { id: string; parent_category?: string | null }): string {
  const cat = uiCategoryFromDbField(p.parent_category || null) || "Toutes";
  const params = new URLSearchParams();
  params.set("category", cat);
  params.set("promo_id", p.id);
  return `/search?${params.toString()}`;
}
