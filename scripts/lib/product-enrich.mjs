/**
 * Utilitários partilhados para enriquecer nomes e dados de pneus por EAN.
 */
import { fetchEprelProductByGtin } from './eprel-client.mjs';
import { getGtinCache, setGtinCache, sleep } from './gtin-cache.mjs';

const GTINHUB = (process.env.GTINHUB_BASE_URL || 'https://gtinhub.com/api/v1').replace(/\/$/, '');
const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';

const GENERIC_BRANDS =
  'mitas|continental|nexen|hankook|barum|pirelli|kumho|kleber|triangle|mrf|sava|dunlop|metzeler|goodyear|bridgestone|michelin|falken|gitigroup|roadstone|sava|kleber';

/** Pausa global após rate limit do GTINHub (ms). */
let gtinHubCooldownUntil = 0;
let lastGtinHubRequestAt = 0;

function gtinHubMinIntervalMs() {
  const configured = Number(process.env.GTINHUB_MIN_INTERVAL_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  // Plano grátis: ~10 pedidos/dia — espaçar pedidos reduz 429 temporários
  return process.env.GTINHUB_API_KEY ? 2500 : 8000;
}

async function waitForGtinHubSlot() {
  const now = Date.now();
  if (now < gtinHubCooldownUntil) {
    const wait = gtinHubCooldownUntil - now;
    await sleep(wait);
  }
  const sinceLast = Date.now() - lastGtinHubRequestAt;
  const minGap = gtinHubMinIntervalMs();
  if (sinceLast < minGap) {
    await sleep(minGap - sinceLast);
  }
}

export function normalizeGtin(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function parseTireSpecsFromText(text) {
  const specs = {};
  const t = String(text || '');
  const radial = t.match(/(\d{2,3})\s*\/\s*(\d{2})\s*(?:ZR|R)\s*(\d{2})(?:\s+(\d{2,3})\s*([A-Z]))?/i);
  if (radial) {
    specs.width = radial[1];
    specs.height = radial[2];
    specs.diameter = radial[3];
    if (radial[4]) specs.load_index = radial[4];
    if (radial[5]) specs.speed_index = radial[5].toUpperCase();
    return specs;
  }
  const moto = t.match(/(\d{2,3})\s*\/\s*(\d{2})\s*-\s*(\d{2})/);
  if (moto) {
    specs.width = moto[1];
    specs.height = moto[2];
    specs.diameter = moto[3];
  }
  return specs;
}

/** Nome parece pneu (medidas ou palavras-chave do setor). */
export function looksLikeTireName(name) {
  if (!name) return false;
  const n = String(name);
  if (/\d{2,3}\s*\/\s*\d{2}/.test(n)) return true;
  if (/\d{2,3}\s*\/\s*\d{2}\s*-\s*\d{2}/.test(n)) return true;
  if (/\b(tyre|tire|pneu|reifen|pneumatico|winter|summer|all[- ]season|runflat|xl)\b/i.test(n)) {
    return true;
  }
  return false;
}

/** Nome genérico da importação NA (marca + ref, sem modelo/medidas reais). */
export function isGenericProductName(name) {
  if (!name || !String(name).trim()) return true;
  const n = String(name).trim();
  const lower = n.toLowerCase();

  if (lower.includes('exemplo') || lower.includes('pneu na')) return true;
  if (/^pneu na ref\./i.test(n)) return true;
  if (/·\s*ref\.\s*\d+/i.test(n)) return true;
  if (/\bref\.?\s*#?\s*\d{3,}/i.test(n)) return true;
  if (/\bref\s+\d{3,}/i.test(n)) return true;
  if (new RegExp(`^(${GENERIC_BRANDS})\\s+pneu\\b`, 'i').test(n)) return true;
  // "Continental Continental Pneu · Ref. 13071"
  if (/^([a-zà-ú0-9][a-zà-ú0-9 .+'-]{1,30})\s+\1\s+pneu\b/i.test(n)) return true;

  if (!looksLikeTireName(n)) return true;

  return false;
}

export function applyParsedSpecs(detail) {
  if (!detail || detail.specs?.width) return detail;
  const parsed = parseTireSpecsFromText(detail.name || '');
  if (!parsed.width) return detail;
  return { ...detail, specs: { ...(detail.specs || {}), ...parsed } };
}

function gtinHubHeaders() {
  const headers = { Accept: 'application/json' };
  if (process.env.GTINHUB_API_KEY) headers['X-API-Key'] = process.env.GTINHUB_API_KEY;
  return headers;
}

async function fetchFromGtinHubOnce(gtin) {
  const res = await fetch(`${GTINHUB}/product/${gtin}`, { headers: gtinHubHeaders() });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'));
    return { rateLimited: true, retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : null };
  }
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.found || !json.product?.name) return null;
  const p = json.product;
  return applyParsedSpecs({
    source: 'gtinhub',
    name: p.name.trim(),
    brand: p.brand || null,
    description: p.description || null,
    category: p.category || null,
    imageUrl: p.image_url || null,
    specs: {},
  });
}

async function fetchFromGtinHub(gtin, { ignoreSkip = false, maxRetries = 4 } = {}) {
  if (!ignoreSkip && process.env.SKIP_GTINHUB === '1') return { skipped: true };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await waitForGtinHubSlot();
    lastGtinHubRequestAt = Date.now();

    try {
      const result = await fetchFromGtinHubOnce(gtin);
      if (!result?.rateLimited) return result;

      const waitMs = result.retryAfterMs ?? Math.min(120000, 8000 * 2 ** attempt);
      if (attempt < maxRetries) {
        gtinHubCooldownUntil = Date.now() + waitMs;
        await sleep(waitMs);
        continue;
      }

      gtinHubCooldownUntil = Date.now() + Math.max(waitMs, 90000);
      return { rateLimited: true, exhaustedRetries: true };
    } catch {
      if (attempt < maxRetries) {
        const waitMs = 4000 * (attempt + 1);
        gtinHubCooldownUntil = Date.now() + waitMs;
        await sleep(waitMs);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchFromUpcItemDb(gtin) {
  try {
    const res = await fetch(`${UPC_TRIAL}?upc=${gtin}`, { headers: { Accept: 'application/json' } });
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) return null;
    const item = (await res.json()).items?.[0];
    if (!item?.title) return null;
    return applyParsedSpecs({
      source: 'upcitemdb',
      name: item.title.trim(),
      brand: item.brand || null,
      description: item.description || null,
      category: item.category || null,
      imageUrl: item.images?.[0] || null,
      specs: {},
    });
  } catch {
    return null;
  }
}

function isUsableTireDetail(detail) {
  return Boolean(detail?.name && !isGenericProductName(detail.name) && looksLikeTireName(detail.name));
}

function pickReason({ hub, upc, eprel, useEprel }) {
  if (hub?.skipped) return 'gtinhub_desativado';
  if (upc?.rateLimited) return 'upc_rate_limit';
  if (isUsableTireDetail(upc)) return 'nao_encontrado';
  if (hub?.name && !looksLikeTireName(hub.name)) return 'gtinhub_produto_errado';
  if (upc?.name && !looksLikeTireName(upc.name)) return 'upc_produto_errado';
  if (useEprel && isUsableTireDetail(eprel)) return 'nao_encontrado';
  if (useEprel && eprel && !isUsableTireDetail(eprel)) return 'eprel_sem_nome_util';
  if (hub?.rateLimited) return 'gtinhub_rate_limit';
  if (useEprel && !eprel) return 'eprel_nao_encontrado';
  return 'nao_encontrado';
}

/**
 * Busca o nome comercial original por EAN.
 * Ordem padrão com eprelFirst: cache → EPREL → GTINHub → UPC
 */
export async function fetchOriginalNameByGtin(
  gtin,
  {
    useEprel = false,
    eprelFirst = false,
    ignoreGtinHubSkip = true,
    useCache = true,
    skipGtinHub = false,
  } = {}
) {
  const normalized = normalizeGtin(gtin);
  if (normalized.length < 8) return { detail: null, reason: 'ean_invalido' };

  if (useCache) {
    const cached = getGtinCache(normalized);
    if (cached && isUsableTireDetail(cached)) {
      return { detail: cached, reason: null, fromCache: true };
    }
  }

  let hub = null;
  let eprel = null;

  const tryEprel = async () => {
    if (!useEprel) return null;
    const result = await fetchEprelNameByGtin(normalized);
    if (isUsableTireDetail(result)) {
      if (useCache) setGtinCache(normalized, result);
      return result;
    }
    return result;
  };

  const tryHub = async () => {
    if (skipGtinHub) return null;
    const result = await fetchFromGtinHub(normalized, { ignoreSkip: ignoreGtinHubSkip });
    if (result?.skipped) return { skipped: true };
    if (isUsableTireDetail(result)) {
      if (useCache) setGtinCache(normalized, result);
      return result;
    }
    return result;
  };

  if (eprelFirst && useEprel) {
    eprel = await tryEprel();
    if (isUsableTireDetail(eprel)) return { detail: eprel, reason: null };
  }

  if (!skipGtinHub) {
    hub = await tryHub();
    if (hub?.skipped) return { detail: null, reason: 'gtinhub_desativado' };
    if (isUsableTireDetail(hub)) return { detail: hub, reason: null };
    if (hub?.name && !looksLikeTireName(hub.name)) {
      return { detail: null, reason: 'gtinhub_produto_errado' };
    }
  }

  if (!eprelFirst && useEprel) {
    eprel = await tryEprel();
    if (isUsableTireDetail(eprel)) return { detail: eprel, reason: null };
  }

  const upc = await fetchFromUpcItemDb(normalized);
  if (isUsableTireDetail(upc)) {
    if (useCache) setGtinCache(normalized, upc);
    return { detail: upc, reason: null };
  }

  return {
    detail: null,
    reason: pickReason({ hub, upc, eprel, useEprel }),
  };
}

export async function fetchEprelNameByGtin(gtin) {
  if (!process.env.EPREL_API_KEY?.trim()) return null;
  const detail = await fetchEprelProductByGtin(gtin);
  if (!detail?.name || isGenericProductName(detail.name)) return null;
  return detail;
}

/** EPREL completo (mesmo sem nome útil — para medidas/labels). */
export async function fetchEprelFullByGtin(gtin) {
  if (!process.env.EPREL_API_KEY?.trim()) return null;
  return fetchEprelProductByGtin(gtin);
}

function pickBestName(...candidates) {
  for (const c of candidates) {
    if (c?.name && isUsableTireDetail(c)) return c;
  }
  for (const c of candidates) {
    if (c?.name && !isGenericProductName(c.name) && looksLikeTireName(c.name)) return c;
  }
  return null;
}

/**
 * Enriquecimento completo por EAN: EPREL + nome real (GTINHub/UPC).
 * Uma única passagem por produto — funde todas as fontes.
 */
export async function fetchFullEnrichmentByGtin(gtin, opts = {}) {
  const normalized = normalizeGtin(gtin);
  if (normalized.length < 8) return { merged: null, reason: 'ean_invalido', sources: [] };

  const { useCache = true, skipGtinHub = false } = opts;

  if (useCache) {
    const cached = getGtinCache(normalized);
    if (cached?.fullEnrich) {
      return { merged: cached.fullEnrich, reason: null, fromCache: true, sources: cached.sources || [] };
    }
  }

  const sources = [];
  let eprel = null;
  let nameDetail = null;
  let failReason = null;

  if (process.env.EPREL_API_KEY?.trim()) {
    eprel = await fetchEprelFullByGtin(normalized);
    if (eprel?.registrationNumber) sources.push('eprel');
  }

  if (!pickBestName(eprel) && !skipGtinHub) {
    const nameResult = await fetchOriginalNameByGtin(normalized, {
      useEprel: !pickBestName(eprel),
      eprelFirst: false,
      skipGtinHub: false,
      useCache: false,
    });
    if (nameResult.detail?.source && !sources.includes(nameResult.detail.source)) {
      sources.push(nameResult.detail.source);
    }
    nameDetail = nameResult.detail;
    if (!nameDetail) failReason = nameResult.reason;
  } else if (!pickBestName(eprel) && skipGtinHub) {
    failReason = 'gtinhub_desativado';
  }

  const bestName = pickBestName(eprel, nameDetail);
  if (!bestName?.name) {
    return { merged: null, reason: failReason || (eprel ? 'eprel_sem_nome_util' : 'nao_encontrado'), sources, eprel };
  }

  const merged = {
    source: bestName.source,
    sources: [...sources],
    name: bestName.name,
    brand: bestName.brand || eprel?.brand || nameDetail?.brand || null,
    description: bestName.description || eprel?.description || nameDetail?.description || null,
    category: eprel?.category || nameDetail?.category || null,
    imageUrl: nameDetail?.imageUrl || null,
    specs: {
      ...(nameDetail?.specs || {}),
      ...(eprel?.specs || {}),
    },
    labels: eprel?.labels || null,
    registrationNumber: eprel?.registrationNumber || null,
    productGroup: eprel?.productGroup || 'tyres',
    tyreClass: eprel?.tyreClass || null,
  };

  if (!merged.specs?.width && merged.name) {
    Object.assign(merged.specs, parseTireSpecsFromText(merged.name));
  }

  if (useCache) {
    setGtinCache(normalized, { fullEnrich: merged, sources: merged.sources });
  }

  return { merged, reason: null, sources: merged.sources, eprel };
}

/** Produto precisa de enriquecimento (nome genérico ou medidas em falta). */
export function needsCatalogEnrichment(product, { force = false } = {}) {
  if (force) return true;
  if (isGenericProductName(product.name)) return true;
  const specs = typeof product.specs === 'object' && product.specs ? product.specs : {};
  const missingDims = !specs.width || !specs.height || !specs.diameter;
  if (missingDims && !product.external_metadata?.catalog_enrich?.enrichedAt) return true;
  return false;
}

export function shouldUpdateCategory(current, patchCategory) {
  if (!patchCategory) return false;
  if (!current) return true;
  if (current === patchCategory) return false;
  if (current === 'Auto' && patchCategory !== 'Auto') return true;
  if (patchCategory === 'Camion' || patchCategory === 'Tracteur') return true;
  return false;
}

/** Marcas atribuídas por heurística EAN — devem ser substituídas pela API GTIN. */
export const HEURISTIC_BRAND_ALIASES = new Set([
  'gitigroup',
  'giti',
  'giti group',
  'giti tire',
  'continental',
  'nexen',
  'hankook',
  'barum',
  'pirelli',
  'kumho',
  'kleber',
  'triangle',
  'mrf',
  'sava',
  'mitas',
  'nexes',
  'khumo',
]);

/** Filtro SQL para nomes genéricos da importação NA. */
export function genericNameSqlClause(alias = '') {
  const col = alias ? `${alias}.name` : 'name';
  const brands = GENERIC_BRANDS;
  return `(
    ${col} IS NULL OR trim(${col}) = ''
    OR ${col} ~* '^pneu na ref'
    OR ${col} ~* '·[[:space:]]*ref\\.[[:space:]]*[0-9]'
    OR ${col} ~* '\\mref\\.?[[:space:]]*#?[[:space:]]*[0-9]{3,}'
    OR ${col} ~* '^([A-Za-z0-9][A-Za-z0-9 .+-]{1,30})[[:space:]]+\\1[[:space:]]+pneu'
    OR ${col} ~* '^(${brands})[[:space:]]+pneu\\y'
  )`;
}

export function shouldUpdateBrand(productBrand, productName, mergedBrand) {
  if (!mergedBrand?.trim()) return false;
  if (!productBrand?.trim()) return true;
  if (isGenericProductName(productName)) return true;
  if (HEURISTIC_BRAND_ALIASES.has(productBrand.trim().toLowerCase())) return true;
  return false;
}

export function hasRealImage(images) {
  if (!Array.isArray(images) || !images.length) return false;
  const url = String(images[0] || '');
  if (!url || url.includes('placehold.co') || url.includes('text=Pneu')) return false;
  return true;
}

export function parseScriptArgs(argv) {
  const opts = {
    dryRun: false,
    force: false,
    supplier: 'neumaticos_andres',
    limit: 0,
    delayMs: Number(process.env.GTIN_LOOKUP_DELAY_MS || 1200),
    images: true,
    category: null,
    skipGtinHub: false,
    eprelFirst: true,
    onlyGtinHub: false,
    noCache: false,
    ref: null,
    brand: null,
    refs: [],
    genericOnly: true,
    all: false,
  };
  for (const arg of argv) {
    if (arg === '--all') {
      opts.all = true;
      opts.genericOnly = false;
    }
    if (arg === '--generic-only') opts.genericOnly = true;
    if (arg === '--force') opts.force = true;
    if (arg === '--no-images') opts.images = false;
    if (arg === '--skip-gtinhub') opts.skipGtinHub = true;
    if (arg === '--only-gtinhub') {
      opts.onlyGtinHub = true;
      opts.skipGtinHub = false;
      opts.eprelFirst = false;
      if (!process.argv.some((a) => a.startsWith('--delay='))) {
        opts.delayMs = Math.max(opts.delayMs, 10000);
      }
    }
    if (arg === '--no-eprel-first') opts.eprelFirst = false;
    if (arg === '--no-cache') opts.noCache = true;
    if (arg.startsWith('--supplier=')) opts.supplier = arg.slice(11);
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--delay=')) opts.delayMs = Number(arg.slice(8));
    if (arg.startsWith('--category=')) opts.category = arg.slice(11);
    if (arg.startsWith('--ref=')) opts.ref = arg.slice(6);
    if (arg.startsWith('--refs=')) {
      opts.refs = arg
        .slice(7)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (arg.startsWith('--brand=')) opts.brand = arg.slice(8);
  }
  return opts;
}

export function getDbUrl() {
  return process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';
}
