import 'server-only';

import type { PoolClient } from 'pg';
import { dbCategoryFromUi, normalizeSpecValue } from '@/lib/product-query-helpers';

/**
 * Pesquisa de catálogo no servidor: filtros, paginação e facetas numa única
 * ida à base de dados. Substitui a filtragem em memória feita no browser.
 */

export const SEARCH_PAGE_SIZE_DEFAULT = 24;
export const SEARCH_PAGE_SIZE_MAX = 60;
export const SEARCH_MAX_IDS = 200;

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc';

export type SearchParams = {
  category: string; // UI: Toutes | Auto | Moto | Camion | Tracteurs
  paTipo: string;
  width: string;
  height: string;
  diameter: string;
  loadIndex: string;
  speedIndex: string;
  season: string; // vazio | Tous | Été | Hiver | 4 Saisons (ou aliases)
  brand: string;
  q: string;
  priceMin: number | null;
  priceMax: number | null;
  ids: string[];
  page: number;
  pageSize: number;
  sort: SearchSort;
};

export type SearchFacets = {
  widths: string[];
  heights: string[];
  diameters: string[];
  brands: Array<{ id: string | null; name: string }>;
};

export type SearchResult<Row = Record<string, unknown>> = {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacets;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aliases de estação (Hero envia 'ete'/'hiver'/'4-saisons'; BD guarda 'Été', 'Hiver', '4 Saisons'). */
export function seasonAliases(raw: string): string[] | null {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, ' ');
  if (!s || s === 'tous' || s === 'toutes' || s === 'all') return null;
  if (['ete', 'summer', 'estival'].includes(s)) return ['ete', 'été', 'summer'];
  if (['hiver', 'winter'].includes(s)) return ['hiver', 'winter'];
  if (['4 saisons', '4saisons', 'all season', 'all seasons', 'toutes saisons', 'quatre saisons', '4s'].includes(s)) {
    return ['4 saisons', 'all season', 'all seasons', 'toutes saisons', '4-saisons'];
  }
  return [s];
}

export function parseSearchParams(sp: URLSearchParams): SearchParams {
  const int = (v: string | null, def: number, min: number, max: number) => {
    const n = Number.parseInt(v || '', 10);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  };
  const num = (v: string | null) => {
    if (v == null || v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const str = (k: string, max = 80) => (sp.get(k) || '').trim().slice(0, max);
  const sortRaw = sp.get('sort');
  const sort: SearchSort =
    sortRaw === 'price_asc' || sortRaw === 'price_desc' || sortRaw === 'name_asc' ? sortRaw : 'relevance';

  const ids = (sp.get('product_ids') || sp.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, SEARCH_MAX_IDS);

  return {
    category: str('category') || 'Toutes',
    paTipo: str('pa_tipo'),
    width: str('width', 10),
    height: str('height', 10),
    diameter: str('diameter', 10),
    loadIndex: str('load_index', 10),
    speedIndex: str('speed_index', 5),
    season: str('season', 20),
    brand: str('brand'),
    q: str('q', 60),
    priceMin: num(sp.get('price_min')),
    priceMax: num(sp.get('price_max')),
    ids,
    page: int(sp.get('page'), 1, 1, 10_000),
    pageSize: int(sp.get('page_size'), SEARCH_PAGE_SIZE_DEFAULT, 1, SEARCH_PAGE_SIZE_MAX),
    sort,
  };
}

class SqlBuilder {
  clauses: string[] = ['p.is_active = true'];
  params: unknown[] = [];
  add(clause: (idx: (v: unknown) => string) => string) {
    this.clauses.push(clause((v) => `$${this.params.push(v)}`));
  }
  where() {
    return this.clauses.join('\n  and ');
  }
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Filtros de âmbito (categoria + subcategoria) — usados para resultados e para facetas. */
function applyScope(b: SqlBuilder, p: SearchParams) {
  const cat = dbCategoryFromUi(p.category);
  if (cat === 'Tracteur') {
    b.add(() => `lower(p.category) like 'tracteur%'`);
  } else if (cat) {
    b.add((i) => `lower(p.category) = lower(${i(cat)})`);
  }
  if (p.paTipo) {
    b.add((i) => `lower(regexp_replace(coalesce(p.pa_tipo, ''), '\\s+', ' ', 'g')) = lower(${i(p.paTipo.replace(/\s+/g, ' '))})`);
  }
}

function applyDimensionFilters(b: SqlBuilder, p: SearchParams, upTo: 'width' | 'height' | 'all') {
  if (p.width) b.add((i) => `p.specs->>'width' = ${i(normalizeSpecValue(p.width))}`);
  if (upTo === 'width') return;
  if (p.height) b.add((i) => `p.specs->>'height' = ${i(normalizeSpecValue(p.height))}`);
  if (upTo === 'height') return;
  if (p.diameter) b.add((i) => `p.specs->>'diameter' = ${i(normalizeSpecValue(p.diameter))}`);
}

function applyRemainingFilters(b: SqlBuilder, p: SearchParams) {
  if (p.loadIndex) b.add((i) => `p.specs->>'load_index' = ${i(normalizeSpecValue(p.loadIndex))}`);
  if (p.speedIndex) b.add((i) => `upper(p.specs->>'speed_index') = upper(${i(p.speedIndex)})`);

  const seasons = seasonAliases(p.season);
  if (seasons) {
    b.add((i) => `lower(translate(coalesce(p.specs->>'season', ''), 'ÉéÈèÊê', 'EeEeEe')) = any(${i(seasons.map((s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))})`);
  }

  if (p.brand) {
    b.add((i) => {
      const exact = i(p.brand);
      const like = i(`%${escapeLike(p.brand)}%`);
      return `(lower(b.name) = lower(${exact}) or p.brand ilike ${like} escape '\\')`;
    });
  }

  if (p.q.length >= 2) {
    b.add((i) => {
      const like = i(`%${escapeLike(p.q)}%`);
      return `(p.name ilike ${like} escape '\\' or p.brand ilike ${like} escape '\\' or b.name ilike ${like} escape '\\'
        or p.category ilike ${like} escape '\\' or p.pa_tipo ilike ${like} escape '\\' or p.description ilike ${like} escape '\\')`;
    });
  }

  if (p.priceMin != null) b.add((i) => `p.base_price >= ${i(p.priceMin)}`);
  if (p.priceMax != null) b.add((i) => `p.base_price <= ${i(p.priceMax)}`);

  if (p.ids.length) b.add((i) => `p.id = any(${i(p.ids)}::uuid[])`);
}

function orderBy(sort: SearchSort, qParamIndex: number | null): string {
  switch (sort) {
    case 'price_asc':
      return 'p.base_price asc nulls last, p.name asc';
    case 'price_desc':
      return 'p.base_price desc nulls last, p.name asc';
    case 'name_asc':
      return 'p.name asc';
    default:
      return qParamIndex ? `(p.name ilike $${qParamIndex} escape '\\') desc, p.created_at desc nulls last, p.name asc` : 'p.created_at desc nulls last, p.name asc';
  }
}

const FROM = `from public.products p left join public.brands b on b.id = p.brand_id`;

export async function searchProducts(client: PoolClient, p: SearchParams): Promise<SearchResult> {
  // --- resultados ---
  const main = new SqlBuilder();
  applyScope(main, p);
  applyDimensionFilters(main, p, 'all');
  applyRemainingFilters(main, p);

  let qIdx: number | null = null;
  if (p.sort === 'relevance' && p.q.length >= 2) {
    qIdx = main.params.push(`%${escapeLike(p.q)}%`);
  }
  const offset = (p.page - 1) * p.pageSize;
  const limitIdx = main.params.push(p.pageSize);
  const offsetIdx = main.params.push(offset);

  const itemsSql = `
    select p.*,
           case when b.id is null then null
                else json_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url) end as brands,
           count(*) over() as __total
    ${FROM}
    where ${main.where()}
    order by ${orderBy(p.sort, qIdx)}
    limit $${limitIdx} offset $${offsetIdx}`;

  // --- facetas (âmbito categoria/subcategoria; dimensões em cascata) ---
  const fw = new SqlBuilder();
  applyScope(fw, p);
  const widthsSql = `select distinct p.specs->>'width' as v ${FROM} where ${fw.where()} and coalesce(p.specs->>'width','') <> ''`;

  const fh = new SqlBuilder();
  applyScope(fh, p);
  applyDimensionFilters(fh, p, 'width');
  const heightsSql = p.width
    ? `select distinct p.specs->>'height' as v ${FROM} where ${fh.where()} and coalesce(p.specs->>'height','') <> ''`
    : null;

  const fd = new SqlBuilder();
  applyScope(fd, p);
  applyDimensionFilters(fd, p, 'height');
  const diametersSql = p.width && p.height
    ? `select distinct p.specs->>'diameter' as v ${FROM} where ${fd.where()} and coalesce(p.specs->>'diameter','') <> ''`
    : null;

  const fb = new SqlBuilder();
  applyScope(fb, p);
  const brandsSql = `
    select distinct on (lower(coalesce(b.name, p.brand))) b.id, coalesce(b.name, p.brand) as name
    ${FROM}
    where ${fb.where()} and coalesce(b.name, p.brand, '') <> ''
    order by lower(coalesce(b.name, p.brand))`;

  const [items, widths, heights, diameters, brands] = await Promise.all([
    client.query(itemsSql, main.params),
    client.query<{ v: string }>(widthsSql, fw.params),
    heightsSql ? client.query<{ v: string }>(heightsSql, fh.params) : Promise.resolve({ rows: [] as { v: string }[] }),
    diametersSql ? client.query<{ v: string }>(diametersSql, fd.params) : Promise.resolve({ rows: [] as { v: string }[] }),
    client.query<{ id: string | null; name: string }>(brandsSql, fb.params),
  ]);

  const total = items.rows.length ? Number(items.rows[0].__total) : 0;
  const rows = items.rows.map((r) => {
    const { __total, ...rest } = r as Record<string, unknown> & { __total: unknown };
    void __total;
    return rest;
  });

  const numericSort = (a: string, b: string) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  };
  const values = (rs: { v: string }[]) =>
    Array.from(new Set(rs.map((r) => normalizeSpecValue(r.v)).filter(Boolean))).sort(numericSort);

  return {
    items: rows,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    facets: {
      widths: values(widths.rows),
      heights: values(heights.rows),
      diameters: values(diameters.rows),
      brands: brands.rows.map((r) => ({ id: r.id, name: r.name })),
    },
  };
}

/** Combinações de dimensões (para o Hero): lista pequena em vez de todos os `specs`. */
export async function dimensionCombos(client: PoolClient, category: string) {
  const b = new SqlBuilder();
  applyScope(b, { ...emptyParams(), category });
  const res = await client.query<{ width: string; height: string; diameter: string; load_index: string; speed_index: string }>(
    `select distinct p.specs->>'width' as width, p.specs->>'height' as height, p.specs->>'diameter' as diameter,
            p.specs->>'load_index' as load_index, p.specs->>'speed_index' as speed_index
       ${FROM}
      where ${b.where()} and coalesce(p.specs->>'width','') <> ''`,
    b.params
  );
  return res.rows;
}

export function emptyParams(): SearchParams {
  return {
    category: 'Toutes',
    paTipo: '',
    width: '',
    height: '',
    diameter: '',
    loadIndex: '',
    speedIndex: '',
    season: '',
    brand: '',
    q: '',
    priceMin: null,
    priceMax: null,
    ids: [],
    page: 1,
    pageSize: SEARCH_PAGE_SIZE_DEFAULT,
    sort: 'relevance',
  };
}
