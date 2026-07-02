import 'server-only';

import { fetchEprelProductByGtin } from '@/lib/eprel/client';
import { mapEprelToProductPatch } from '@/lib/eprel/map-to-product';
import { lookupEanHeuristics } from './ean-heuristics';
import { parseTireSpecsFromText } from './tire-size-parse';
import type { GtinProductDetail } from './types';
import { fetchFromTireCatalog } from './tire-catalog-fallback';

const GTINHUB_DEFAULT = 'https://gtinhub.com/api/v1';
const UPCITEMDB_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';
const UPCITEMDB_V1 = 'https://api.upcitemdb.com/prod/v1/lookup';

export class GtinLookupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GtinLookupError';
    this.status = status;
  }
}

export function getGtinEnrichConfig() {
  const gtinHubApiKey = process.env.GTINHUB_API_KEY?.trim() || '';
  const gtinHubBaseUrl = (process.env.GTINHUB_BASE_URL?.trim() || GTINHUB_DEFAULT).replace(/\/$/, '');
  const upcItemDbUserKey = process.env.UPCITEMDB_USER_KEY?.trim() || '';
  const upcItemDbKeyType = process.env.UPCITEMDB_KEY_TYPE?.trim() || '3scale';
  const eprelApiKey = process.env.EPREL_API_KEY?.trim() || '';

  return {
    gtinHubApiKey,
    gtinHubBaseUrl,
    upcItemDbUserKey,
    upcItemDbKeyType,
    eprelConfigured: Boolean(eprelApiKey),
    isConfigured: true,
    providers: {
      eprel: {
        configured: Boolean(eprelApiKey),
        docs: 'https://eprel.ec.europa.eu/screen/requestpublicapikey',
      },
      gtinhub: { freeTierDaily: gtinHubApiKey ? null : 10, docs: 'https://gtinhub.com/api' },
      upcitemdb: {
        freeTierDaily: upcItemDbUserKey ? null : 100,
        docs: 'https://www.upcitemdb.com/wp/docs/main/development/plan/',
      },
      ean_heuristics: { freeTierDaily: null, docs: 'Marca/categoria por prefixo EAN' },
    },
  };
}

export function normalizeGtin(raw: string): string {
  return raw.replace(/\D/g, '');
}

function specsFromPairs(pairs: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(pairs)) return undefined;
  const specs: Record<string, unknown> = {};
  for (const entry of pairs) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const key = String(entry[0]).trim();
    const val = entry[1];
    if (key && val != null && val !== '') specs[key] = val;
  }
  return Object.keys(specs).length ? specs : undefined;
}

async function fetchFromGtinHub(gtin: string): Promise<GtinProductDetail | null> {
  const { gtinHubApiKey, gtinHubBaseUrl } = getGtinEnrichConfig();
  const headers: HeadersInit = { Accept: 'application/json' };
  if (gtinHubApiKey) headers['X-API-Key'] = gtinHubApiKey;

  const url = `${gtinHubBaseUrl}/product/${encodeURIComponent(gtin)}`;
  const response = await fetch(url, { headers, cache: 'no-store' });

  if (response.status === 404 || response.status === 503 || response.status === 429) return null;

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GtinLookupError(text || `GTINHub HTTP ${response.status}`, response.status);
  }

  const json = (await response.json()) as {
    found?: boolean;
    product?: {
      gtin?: string;
      name?: string;
      brand?: string;
      description?: string;
      category?: string;
      image_url?: string;
      raw_data?: { product?: { specs?: unknown } };
    };
  };

  if (!json.found || !json.product) return null;

  const product = json.product;
  return {
    gtin: product.gtin || gtin,
    name: product.name,
    brand: product.brand,
    description: product.description,
    category: product.category,
    imageUrl: product.image_url,
    specs: specsFromPairs(product.raw_data?.product?.specs),
    source: 'gtinhub',
    raw: json,
  };
}

type UpcItem = {
  ean?: string;
  title?: string;
  brand?: string;
  description?: string;
  category?: string;
  color?: string;
  size?: string;
  dimension?: string;
  weight?: string;
  model?: string;
  images?: string[];
};

async function fetchFromUpcItemDb(gtin: string): Promise<GtinProductDetail | null> {
  const { upcItemDbUserKey, upcItemDbKeyType } = getGtinEnrichConfig();
  const headers: Record<string, string> = { Accept: 'application/json' };

  let url: string;
  if (upcItemDbUserKey) {
    url = `${UPCITEMDB_V1}?upc=${encodeURIComponent(gtin)}`;
    headers.user_key = upcItemDbUserKey;
    headers.key_type = upcItemDbKeyType;
  } else {
    url = `${UPCITEMDB_TRIAL}?upc=${encodeURIComponent(gtin)}`;
  }

  const response = await fetch(url, { headers, cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) {
    if (response.status === 429) {
      throw new GtinLookupError('Limite diário UPCitemdb atingido (100/dia no plano grátis).', 429);
    }
    return null;
  }

  const json = (await response.json()) as { items?: UpcItem[] };
  const item = json.items?.[0];
  if (!item) return null;

  const specs: Record<string, unknown> = {};
  if (item.color) specs.color = item.color;
  if (item.size) specs.size = item.size;
  if (item.dimension) specs.dimension = item.dimension;
  if (item.weight) specs.weight = item.weight;
  if (item.model) specs.model = item.model;

  return {
    gtin: item.ean || gtin,
    name: item.title,
    brand: item.brand,
    description: item.description,
    category: item.category,
    imageUrl: item.images?.[0],
    specs: Object.keys(specs).length ? specs : undefined,
    source: 'upcitemdb',
    raw: item,
  };
}

function applyParsedSpecs(detail: GtinProductDetail): GtinProductDetail {
  if (detail.specs?.width) return detail;
  const parsed = parseTireSpecsFromText(detail.name || '');
  if (!parsed.width) return detail;
  return { ...detail, specs: { ...(detail.specs || {}), ...parsed } };
}

async function fetchFromEprel(gtin: string): Promise<GtinProductDetail | null> {
  const detail = await fetchEprelProductByGtin(gtin);
  if (!detail) return null;

  const patch = mapEprelToProductPatch(detail);
  return {
    gtin: normalizeGtin(gtin),
    name: patch.name,
    brand: patch.brand,
    description: patch.description,
    category: undefined,
    specs: patch.specs,
    labels: patch.labels,
    source: 'eprel',
    raw: detail,
  };
}

export async function fetchProductByGtin(
  gtin: string,
  options?: { naRef?: string | null }
): Promise<GtinProductDetail | null> {
  const normalized = normalizeGtin(gtin);
  if (!normalized || normalized.length < 8) {
    throw new Error('EAN/GTIN inválido.');
  }

  const fromEprel = await fetchFromEprel(normalized);
  if (fromEprel?.name && fromEprel.specs?.width) return fromEprel;

  const fromHub = await fetchFromGtinHub(normalized);
  if (fromHub?.name) return applyParsedSpecs(mergeDetail(fromHub, fromEprel));

  const fromUpc = await fetchFromUpcItemDb(normalized);
  if (fromUpc?.name) return applyParsedSpecs(mergeDetail(fromUpc, fromEprel));

  const fromCatalog = fetchFromTireCatalog(normalized);
  if (fromCatalog) return applyParsedSpecs(mergeDetail(fromCatalog, fromEprel));

  if (fromEprel) return fromEprel;

  const heuristic = lookupEanHeuristics(normalized, options?.naRef);
  return heuristic ? applyParsedSpecs(heuristic) : null;
}

function mergeDetail(primary: GtinProductDetail, eprel: GtinProductDetail | null): GtinProductDetail {
  if (!eprel) return primary;
  return {
    ...primary,
    specs: { ...(eprel.specs || {}), ...(primary.specs || {}) },
    labels: eprel.labels || primary.labels,
  };
}
