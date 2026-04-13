function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0' || h === '::1' || h === '127.0.0.1') return true;
  if (h.startsWith('169.254.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;
  return false;
}

export function assertFetchablePublicHttpsUrl(urlString: string): URL {
  let u: URL;
  try {
    u = new URL(urlString.trim());
  } catch {
    throw new Error('URL invalide');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('Seuls http et https sont autorisés');
  }
  if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') {
    throw new Error('HTTPS requis en production');
  }
  if (isBlockedHostname(u.hostname)) {
    throw new Error('Hôte non autorisé');
  }
  return u;
}

const MAX_REDIRECTS = 5;

export async function fetchRemoteImageWithLimit(
  initialUrl: string,
  maxBytes: number,
  allowedMime: Set<string>
): Promise<{ buffer: Buffer; mime: string }> {
  let current = assertFetchablePublicHttpsUrl(initialUrl).toString();
  const signal = AbortSignal.timeout(25_000);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertFetchablePublicHttpsUrl(current);
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'image/*',
        'User-Agent': 'MecanidocImageIngest/1.0',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('Redirection invalide');
      current = new URL(loc, current).toString();
      continue;
    }

    if (!res.ok) {
      throw new Error(`Téléchargement échoué (${res.status})`);
    }

    const rawType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!rawType || !allowedMime.has(rawType)) {
      throw new Error(`Type non autorisé: ${rawType || 'inconnu'}`);
    }

    const declared = res.headers.get('content-length');
    if (declared) {
      const n = parseInt(declared, 10);
      if (!Number.isFinite(n) || n > maxBytes) {
        throw new Error('Fichier trop volumineux');
      }
    }

    if (!res.body) {
      throw new Error('Corps vide');
    }

    const reader = res.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error('Fichier trop volumineux');
      }
      chunks.push(Buffer.from(value));
    }

    return { buffer: Buffer.concat(chunks), mime: rawType };
  }

  throw new Error('Trop de redirections');
}
