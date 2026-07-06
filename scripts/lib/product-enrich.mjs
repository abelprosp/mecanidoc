/**
 * Utilitários partilhados para enriquecer nomes e dados de pneus por EAN.
 */
import { fetchEprelProductByGtin } from './eprel-client.mjs';

const GTINHUB = (process.env.GTINHUB_BASE_URL || 'https://gtinhub.com/api/v1').replace(/\/$/, '');
const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';

const GENERIC_BRANDS =
  'mitas|continental|nexen|hankook|barum|pirelli|kumho|kleber|triangle|mrf|sava|dunlop|metzeler|goodyear|bridgestone|michelin|falken|gitigroup';

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

/** Nome genérico da importação NA (marca + ref, sem modelo/medidas reais). */
export function isGenericProductName(name) {
  if (!name || !String(name).trim()) return true;
  const n = String(name).trim();
  const lower = n.toLowerCase();

  if (lower.includes('exemplo') || lower.includes('pneu na')) return true;
  if (/^pneu na ref\./i.test(n)) return true;
  if (/·\s*ref\.\s*\d+/i.test(n)) return true;
  if (new RegExp(`^(${GENERIC_BRANDS})\\s+pneu\\b`, 'i').test(n)) return true;

  // Nome real de pneu costuma ter medida (ex. 205/55 R16)
  if (!/\d{2,3}\s*\/\s*\d{2}/.test(n) && !/\d{2,3}\s*\/\s*\d{2}\s*-\s*\d{2}/.test(n)) {
    return true;
  }

  return false;
}

export function applyParsedSpecs(detail) {
  if (!detail || detail.specs?.width) return detail;
  const parsed = parseTireSpecsFromText(detail.name || '');
  if (!parsed.width) return detail;
  return { ...detail, specs: { ...(detail.specs || {}), ...parsed } };
}

async function fetchFromGtinHub(gtin) {
  if (process.env.SKIP_GTINHUB === '1') return null;
  const headers = { Accept: 'application/json' };
  if (process.env.GTINHUB_API_KEY) headers['X-API-Key'] = process.env.GTINHUB_API_KEY;
  try {
    const res = await fetch(`${GTINHUB}/product/${gtin}`, { headers });
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
  } catch {
    return null;
  }
}

async function fetchFromUpcItemDb(gtin) {
  try {
    const res = await fetch(`${UPC_TRIAL}?upc=${gtin}`, { headers: { Accept: 'application/json' } });
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

/**
 * Busca o nome comercial original por EAN (sem EPREL).
 * Ordem: GTINHub → UPCitemdb
 */
export async function fetchOriginalNameByGtin(gtin) {
  const normalized = normalizeGtin(gtin);
  if (normalized.length < 8) return null;

  const hub = await fetchFromGtinHub(normalized);
  if (hub?.name && !isGenericProductName(hub.name)) return hub;

  const upc = await fetchFromUpcItemDb(normalized);
  if (upc?.name && !isGenericProductName(upc.name)) return upc;

  return hub || upc || null;
}

/**
 * Busca nome comercial via EPREL (script separado).
 */
export async function fetchEprelNameByGtin(gtin) {
  if (!process.env.EPREL_API_KEY?.trim()) return null;
  const detail = await fetchEprelProductByGtin(gtin);
  if (!detail?.name || isGenericProductName(detail.name)) return null;
  return detail;
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
    delayMs: 300,
    images: true,
    category: null,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--force') opts.force = true;
    if (arg === '--no-images') opts.images = false;
    if (arg.startsWith('--supplier=')) opts.supplier = arg.slice(11);
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--delay=')) opts.delayMs = Number(arg.slice(8));
    if (arg.startsWith('--category=')) opts.category = arg.slice(11);
  }
  return opts;
}

export function getDbUrl() {
  return process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';
}
