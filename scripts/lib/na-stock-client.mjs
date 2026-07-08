/**
 * Cliente mínimo para a API Neumáticos Andrés (getstock).
 */

export function getNaConfig() {
  const login = process.env.NEUMATICOS_ANDRES_LOGIN?.trim();
  const password = process.env.NEUMATICOS_ANDRES_PASSWORD?.trim();
  const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend-pre2.genasa.es').replace(
    /\/$/,
    ''
  );
  const postCode = process.env.NA_IMPORT_POST_CODE || '75001';
  return { login, password, baseUrl, postCode, configured: Boolean(login && password) };
}

export async function fetchNaStockArticle(articleNumber, postCode) {
  const cfg = getNaConfig();
  if (!cfg.configured) {
    return { error: 'na_not_configured' };
  }

  const code = String(articleNumber || '').trim();
  if (!code) return { error: 'invalid_ref' };

  const pc = postCode || cfg.postCode;
  const url = `${cfg.baseUrl}/api/na/getstock/${encodeURIComponent(code)}?post-code=${encodeURIComponent(pc)}`;

  try {
    const res = await fetch(url, {
      headers: { login: cfg.login, password: cfg.password, Accept: 'application/json' },
    });
    if (!res.ok) return { error: `http_${res.status}` };
    const json = await res.json();
    const article = json.articles?.[0];
    if (!article || article.success !== 1) {
      return { error: 'article_not_found', article };
    }
    return { article };
  } catch {
    return { error: 'network_error' };
  }
}
