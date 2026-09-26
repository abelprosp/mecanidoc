import 'server-only';

/**
 * Limitador de tentativas em memória (janela fixa). Suficiente para uma instância
 * única (VPS). Para várias réplicas, substituir por um armazenamento partilhado.
 */
type Bucket = { count: number; resetAt: number };

const g = globalThis as typeof globalThis & { __mecanidocRateLimit?: Map<string, Bucket> };

function store(): Map<string, Bucket> {
  if (!g.__mecanidocRateLimit) g.__mecanidocRateLimit = new Map();
  return g.__mecanidocRateLimit;
}

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store()) {
    if (bucket.resetAt <= now) store().delete(key);
  }
}

export type RateLimitOptions = { limit: number; windowMs: number };

export function rateLimit(key: string, opts: RateLimitOptions): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const bucket = store().get(key);
  if (!bucket || bucket.resetAt <= now) {
    store().set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: Math.ceil(opts.windowMs / 1000) };
  }
  bucket.count += 1;
  const ok = bucket.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Repõe o contador (ex.: após login bem-sucedido). */
export function rateLimitReset(key: string) {
  store().delete(key);
}

/** IP do cliente atrás de proxy (nginx/traefik) ou direto. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
