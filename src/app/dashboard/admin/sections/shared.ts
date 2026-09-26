/** URL externe ou Storage → copie vers bucket et URL du site (/imagem/...). */
export async function normalizeAdminImageUrl(
  raw: string,
  opts: { kind: 'product'; productId: string } | { kind: 'brand'; brandId?: string }
): Promise<string> {
  const t = raw.trim();
  if (!t) return '';
  if (t.startsWith('/imagem/')) return t;
  try {
    const u = new URL(t);
    if (u.pathname.startsWith('/imagem/')) return t;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return t;
  } catch {
    return t;
  }

  const body =
    opts.kind === 'product'
      ? { url: t, kind: 'product' as const, productId: opts.productId }
      : { url: t, kind: 'brand' as const, brandId: opts.brandId };

  const res = await fetch('/api/admin/ingest-image-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : "Échec de l'import d'image");
  if (!data.url || typeof data.url !== 'string') throw new Error('Réponse serveur invalide');
  return data.url;
}
