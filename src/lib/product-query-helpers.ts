/**
 * Filtros de produto reutilizáveis (categoria UI ↔ coluna `products.category`, specs JSONB).
 */

export function dbCategoryFromUi(uiCategory: string): string | null {
  if (!uiCategory || uiCategory === 'Toutes') return null;
  if (uiCategory === 'Tracteurs') return 'Tracteur';
  return uiCategory;
}

/** Compatível com maiúsculas e Tracteur / Tracteurs na BD. */
export function applyCategoryToQuery(query: any, uiCategory: string) {
  const cat = dbCategoryFromUi(uiCategory);
  if (!cat) return query;
  if (cat === 'Tracteur') {
    return query.or('category.ilike.Tracteur,category.ilike.Tracteurs');
  }
  return query.ilike('category', cat);
}

export function productMatchesUiCategory(
  productCategory: string | null | undefined,
  uiCategory: string
): boolean {
  const want = dbCategoryFromUi(uiCategory);
  if (!want) return true;
  const p = (productCategory || '').trim().toLowerCase();
  const w = want.toLowerCase();
  if (p === w) return true;
  if (w === 'tracteur' && (p === 'tracteurs' || p.startsWith('tracteur'))) return true;
  return false;
}

export type SpecsFilterSlice = {
  width: string;
  height: string;
  diameter: string;
  load_index: string;
  speed_index: string;
  season: string;
};

/** Filtros em `specs` via `specs->>chave` (evita falha de `.contains` número vs string). */
export function applySpecsFieldFilters(query: any, f: SpecsFilterSlice) {
  let q = query;
  const t = (s: string) => String(s).trim();
  if (f.width) q = q.eq('specs->>width', t(f.width));
  if (f.height) q = q.eq('specs->>height', t(f.height));
  if (f.diameter) q = q.eq('specs->>diameter', t(f.diameter));
  if (f.load_index) q = q.eq('specs->>load_index', t(f.load_index));
  if (f.speed_index) q = q.eq('specs->>speed_index', t(f.speed_index));
  if (f.season && f.season !== 'Tous') q = q.eq('specs->>season', f.season);
  return q;
}

/** Filtro opcional por subcategoria (coluna `pa_tipo`), alinhado ao menu. */
export function applyPaTipoToQuery(query: any, paTipo: string | null | undefined) {
  const t = paTipo?.trim().replace(/\s+/g, " ");
  if (!t) return query;
  return query.ilike("pa_tipo", t);
}

export function productMatchesPaTipo(
  productPaTipo: string | null | undefined,
  filterPaTipo: string
): boolean {
  const f = filterPaTipo.trim().replace(/\s+/g, " ");
  if (!f) return true;
  const p = (productPaTipo || "").trim().replace(/\s+/g, " ");
  return p.toLowerCase() === f.toLowerCase();
}
