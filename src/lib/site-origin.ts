import type { NextRequest } from 'next/server';

/**
 * Origem pública do site (para URLs absolutas de imagens).
 * Preferir NEXT_PUBLIC_SITE_URL em produção (ex.: https://mecanidoc.com).
 */
export function getSiteOriginFromRequest(request: NextRequest | null): string {
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (env) return env;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}
