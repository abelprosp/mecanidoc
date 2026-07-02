import 'server-only';

import type { EprelProductDetail } from './types';

const DEFAULT_BASE = 'https://eprel.ec.europa.eu/api';

export function getEprelConfig() {
  const apiKey = process.env.EPREL_API_KEY?.trim() || '';
  const baseUrl = (process.env.EPREL_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  return { apiKey, baseUrl, isConfigured: Boolean(apiKey) };
}

export function normalizeGtin(raw: string): string {
  return raw.replace(/\D/g, '');
}

function pickDetail(json: unknown): EprelProductDetail | null {
  if (!json || typeof json !== 'object') return null;
  if ('hits' in json && Array.isArray((json as { hits?: unknown[] }).hits)) {
    const hit = (json as { hits: EprelProductDetail[] }).hits[0];
    return hit || null;
  }
  if (Array.isArray(json)) return (json[0] as EprelProductDetail) || null;
  if ('code' in json && (json as { code?: string }).code === 'NOT_FOUND') return null;
  return json as EprelProductDetail;
}

export async function fetchEprelProductByGtin(gtin: string): Promise<EprelProductDetail | null> {
  const { apiKey, baseUrl, isConfigured } = getEprelConfig();
  if (!isConfigured) return null;

  const normalized = normalizeGtin(gtin);
  if (!normalized || normalized.length < 8) return null;

  const headers: HeadersInit = { Accept: 'application/json', 'X-API-KEY': apiKey };

  const direct = await fetch(`${baseUrl}/product/gtin/${encodeURIComponent(normalized)}`, {
    headers,
    cache: 'no-store',
  });

  if (direct.ok) return pickDetail(await direct.json());
  if (direct.status !== 404) return null;

  const searchUrl = new URL(`${baseUrl}/products/tyres`);
  searchUrl.searchParams.set('gtinIdentifier', normalized);
  searchUrl.searchParams.set('size', '1');
  searchUrl.searchParams.set('offset', '0');

  const search = await fetch(searchUrl.toString(), { headers, cache: 'no-store' });
  if (!search.ok) return null;

  const page = (await search.json()) as { hits?: EprelProductDetail[]; content?: EprelProductDetail[] };
  const hit = page.hits?.[0] || page.content?.[0];
  if (!hit?.registrationNumber) return null;

  const detail = await fetch(`${baseUrl}/products/tyres/${encodeURIComponent(hit.registrationNumber)}`, {
    headers,
    cache: 'no-store',
  });

  if (!detail.ok) return hit;
  return pickDetail(await detail.json()) || hit;
}

/** Etiqueta energética UE em PNG (útil como imagem de produto). */
export async function fetchEprelLabelPng(
  registrationNumber: string,
  productGroup = 'tyres'
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { apiKey, baseUrl, isConfigured } = getEprelConfig();
  if (!isConfigured || !registrationNumber) return null;

  const group = productGroup.toLowerCase();
  const url = `${baseUrl}/products/${encodeURIComponent(group)}/${encodeURIComponent(registrationNumber)}/labels?format=PNG`;

  const res = await fetch(url, {
    headers: { 'X-API-KEY': apiKey, Accept: 'image/png,*/*' },
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!res.ok) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html') || ct.includes('application/json')) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) return null;
  return { buffer, contentType: 'image/png' };
}
