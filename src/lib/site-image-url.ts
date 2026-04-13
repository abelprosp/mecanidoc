import type { NextRequest } from 'next/server';
import { getSiteOriginFromRequest } from '@/lib/site-origin';

export const PUBLIC_IMAGE_BUCKETS = new Set(['product-images', 'brand-logos']);

/** Caminho público relativo: /imagem/{bucket}/... */
export function buildSiteImagePublicPath(bucket: string, objectPath: string): string {
  const safeBucket = bucket.trim();
  if (!PUBLIC_IMAGE_BUCKETS.has(safeBucket)) {
    throw new Error('Bucket non autorisé');
  }
  const segments = objectPath
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..');
  if (segments.length === 0) {
    throw new Error('Chemin invalide');
  }
  const encoded = segments.map((s) => encodeURIComponent(s)).join('/');
  return `/imagem/${encodeURIComponent(safeBucket)}/${encoded}`;
}

export function buildAbsoluteSiteImageUrl(
  request: NextRequest | null,
  bucket: string,
  objectPath: string
): string {
  const origin = getSiteOriginFromRequest(request);
  return `${origin}${buildSiteImagePublicPath(bucket, objectPath)}`;
}

/**
 * Se a URL for do Storage público deste projeto, devolve bucket + chave do objeto (sem re-download).
 */
export function tryParseSupabaseStoragePublicUrl(
  raw: string
): { bucket: string; objectPath: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  let projectOrigin: string;
  try {
    projectOrigin = new URL(base).origin;
  } catch {
    return null;
  }
  if (u.origin !== projectOrigin) return null;
  const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const bucket = m[1];
  const rest = m[2];
  if (!PUBLIC_IMAGE_BUCKETS.has(bucket)) return null;
  const objectPath = rest
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    })
    .join('/');
  if (!objectPath || objectPath.includes('..')) return null;
  return { bucket, objectPath };
}
