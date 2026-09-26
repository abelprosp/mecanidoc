import 'server-only';

import { isIP } from 'net';
import { promises as dns } from 'dns';

/**
 * Download de URLs fornecidas por utilizadores (import CSV, imagens remotas) com
 * proteção contra SSRF:
 *   - só http/https (https obrigatório em produção, salvo opção),
 *   - hostname e TODOS os endereços resolvidos por DNS têm de ser públicos,
 *   - redirects seguidos manualmente e revalidados a cada salto,
 *   - tamanho limitado em streaming (aborta assim que o limite é excedido),
 *   - tipo MIME opcionalmente restrito.
 */

export class SafeFetchError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map((x) => Number.parseInt(x, 10));
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF, 192.0.2.0/24 TEST-NET
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reservado + broadcast
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const h = ip.toLowerCase();
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 unique local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10
  if (h.startsWith('ff')) return true; // multicast
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (h.startsWith('2001:db8')) return true; // documentação
  if (h.startsWith('64:ff9b')) return true; // NAT64 → pode mapear IPv4 privado
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home') || h.endsWith('.arpa')) return true;
  if (h === 'metadata.google.internal' || h === 'metadata') return true;
  return false;
}

export type SafeFetchOptions = {
  maxBytes: number;
  /** MIME types aceites (sem parâmetros). Se omitido, qualquer tipo. */
  allowedMime?: Set<string>;
  accept?: string;
  userAgent?: string;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Por defeito, em produção só https. */
  allowHttpInProduction?: boolean;
};

export async function assertPublicUrl(raw: string, opts: { allowHttpInProduction?: boolean } = {}): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new SafeFetchError('URL invalide');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new SafeFetchError('Seuls http et https sont autorisés');
  }
  if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:' && !opts.allowHttpInProduction) {
    throw new SafeFetchError('HTTPS requis');
  }
  if (u.username || u.password) {
    throw new SafeFetchError('Identifiants dans l’URL non autorisés');
  }
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHostname(host)) {
    throw new SafeFetchError('Hôte non autorisé');
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new SafeFetchError('Adresse IP non autorisée');
    return u;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchError('Hôte introuvable', 502);
  }
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new SafeFetchError('Hôte non autorisé (adresse privée)');
  }
  return u;
}

export async function fetchPublicUrl(
  initialUrl: string,
  opts: SafeFetchOptions
): Promise<{ buffer: Buffer; mime: string; finalUrl: string }> {
  const maxRedirects = opts.maxRedirects ?? 5;
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 30_000);
  let current = (await assertPublicUrl(initialUrl, opts)).toString();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (hop > 0) current = (await assertPublicUrl(current, opts)).toString();

    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: opts.accept || '*/*',
        'User-Agent': opts.userAgent || 'MecaniDoc-Fetch/1.0',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new SafeFetchError('Redirection invalide', 502);
      await res.body?.cancel().catch(() => undefined);
      current = new URL(loc, current).toString();
      continue;
    }

    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new SafeFetchError(`Téléchargement échoué (HTTP ${res.status})`, 502);
    }

    const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (opts.allowedMime && (!mime || !opts.allowedMime.has(mime))) {
      await res.body?.cancel().catch(() => undefined);
      throw new SafeFetchError(`Type non autorisé: ${mime || 'inconnu'}`);
    }

    const declared = res.headers.get('content-length');
    if (declared) {
      const n = Number.parseInt(declared, 10);
      if (Number.isFinite(n) && n > opts.maxBytes) {
        await res.body?.cancel().catch(() => undefined);
        throw new SafeFetchError('Fichier trop volumineux', 413);
      }
    }

    if (!res.body) throw new SafeFetchError('Corps vide', 502);

    const reader = res.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > opts.maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new SafeFetchError('Fichier trop volumineux', 413);
      }
      chunks.push(Buffer.from(value));
    }

    return { buffer: Buffer.concat(chunks), mime, finalUrl: current };
  }

  throw new SafeFetchError('Trop de redirections', 502);
}
