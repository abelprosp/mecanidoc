import 'server-only';

import { createAdminDbClient } from '@/lib/db/client';
import { withAdminContext } from '@/lib/db/pool';
import { assertPublicUrl, SafeFetchError } from '@/lib/safe-fetch';
import { importProductsFromCsvText } from '@/lib/import-products-from-csv';
import { importNeumaticosCatalog } from '@/lib/neumaticos-andres/import-catalog';
import { getStockOne } from '@/lib/neumaticos-andres/client';
import { saveNeumaticosCredentials } from '@/lib/neumaticos-andres/credentials';
import { getProvider, type AdapterKind } from './providers';
import { getConnection, markRun, type ConnectionSecrets } from './store';
import { upsertImportedProduct, type IncomingProduct } from './upsert-product';

export type SyncSummary = {
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  logs: string[];
};

function pick(obj: unknown, path: string | undefined): unknown {
  if (!path || obj == null) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    for (const key of ['items', 'products', 'articles', 'data', 'results', 'tyres', 'tires']) {
      if (Array.isArray(rec[key])) return rec[key] as unknown[];
    }
  }
  return [];
}

function num(v: unknown): number {
  const n = Number.parseFloat(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function mapItem(item: Record<string, unknown>, cfg: Record<string, unknown>): IncomingProduct {
  const g = (key: string, aliases: string[]) => {
    const mapped = cfg[key] ? pick(item, String(cfg[key])) : undefined;
    if (mapped != null && mapped !== '') return mapped;
    for (const a of aliases) {
      if (item[a] != null && item[a] !== '') return item[a];
    }
    return undefined;
  };
  const price = num(g('mapPrice', ['price', 'prix', 'net_price', 'wholesale_price', 'amount']));
  const margin = Number(cfg.marginPercent) || 0;
  return {
    name: String(g('mapName', ['name', 'title', 'label', 'designation', 'Nom']) || '').trim(),
    sku: String(g('mapSku', ['sku', 'ref', 'reference', 'product-id', 'product_id', 'id']) || '') || null,
    ean: String(g('mapEan', ['ean', 'ean13', 'gtin', 'barcode']) || '') || null,
    brand: String(g('mapBrand', ['brand', 'marque', 'make']) || '') || null,
    category: String(g('mapCategory', ['category', 'categorie', 'vehicle', 'type']) || '') || null,
    description: String(g('mapDescription', ['description', 'desc']) || '') || null,
    price: margin ? Math.round(price * (1 + margin / 100) * 100) / 100 : price,
    stock: g('mapStock', ['stock', 'qty', 'quantity', 'amount', 'disponibilite']) as number | null,
    image: String(g('mapImage', ['image', 'image_url', 'photo', 'img']) || '') || null,
    width: String(g('mapWidth', ['width', 'largeur', 'section']) || '') || null,
    height: String(g('mapHeight', ['height', 'hauteur', 'serie', 'aspect']) || '') || null,
    diameter: String(g('mapDiameter', ['diameter', 'diametre', 'jante', 'rim']) || '') || null,
    loadIndex: String(g('mapLoad', ['load_index', 'charge', 'li']) || '') || null,
    speedIndex: String(g('mapSpeed', ['speed_index', 'vitesse', 'si']) || '') || null,
    season: String(g('mapSeason', ['season', 'saison', 'clima']) || '') || null,
  };
}

function authHeaders(adapter: AdapterKind, cfg: Record<string, unknown>, secrets: ConnectionSecrets): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json,text/csv,*/*' };
  if (secrets.token) headers.Authorization = `Bearer ${secrets.token}`;
  if (secrets.apiKey) {
    const name = String(cfg.apiKeyHeader || 'X-API-Key');
    if (name.toLowerCase() === 'authorization' && !secrets.apiKey.toLowerCase().startsWith('bearer ')) {
      headers.Authorization = `Bearer ${secrets.apiKey}`;
    } else {
      headers[name] = secrets.apiKey;
    }
  }
  if (secrets.login && secrets.password) {
    headers.Authorization = `Basic ${Buffer.from(`${secrets.login}:${secrets.password}`).toString('base64')}`;
  }
  void adapter;
  return headers;
}

const MAX_CATALOG_BYTES = 20 * 1024 * 1024;

async function fetchCatalogBuffer(
  url: string,
  cfg: Record<string, unknown>,
  secrets: ConnectionSecrets,
  adapter: AdapterKind
) {
  const safe = await assertPublicUrl(url);
  const extra = authHeaders(adapter, cfg, secrets);
  const res = await fetch(safe.toString(), {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(45_000),
    headers: {
      ...extra,
      Accept: adapter === 'generic_csv' ? 'text/csv,text/plain,*/*' : 'application/json,text/plain,*/*',
      'User-Agent': 'MecaniDoc-SupplierSync/1.0',
    },
  });
  if (res.status >= 300 && res.status < 400) {
    await res.body?.cancel().catch(() => undefined);
    throw new SafeFetchError('Redirection non suivie (hôte à revalider). Indiquez l’URL finale.', 502);
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new SafeFetchError(`Téléchargement échoué (HTTP ${res.status})`, 502);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_CATALOG_BYTES) throw new SafeFetchError('Fichier trop volumineux', 413);
  return { buffer: buf, mime: res.headers.get('content-type') || '', finalUrl: safe.toString() };
}

async function testRestOrCsv(
  adapter: AdapterKind,
  cfg: Record<string, unknown>,
  secrets: ConnectionSecrets
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const url =
    adapter === 'generic_csv'
      ? String(cfg.catalogUrl || '')
      : `${String(cfg.baseUrl || '').replace(/\/$/, '')}${String(cfg.catalogPath || '/products').startsWith('/') ? '' : '/'}${cfg.catalogPath || '/products'}`;
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, message: 'Indiquez une URL HTTPS valide.' };
  }
  try {
    const got = await fetchCatalogBuffer(url, cfg, secrets, adapter);
    if (adapter === 'generic_csv') {
      const head = got.buffer.toString('utf8').split(/\r?\n/)[0] || '';
      return { ok: true, message: `CSV joignable (${(got.buffer.length / 1024).toFixed(0)} Ko). Colonnes : ${head.slice(0, 160)}` };
    }
    const json = JSON.parse(got.buffer.toString('utf8'));
    const items = asArray(cfg.itemsPath ? pick(json, String(cfg.itemsPath)) : json);
    return { ok: true, message: `API joignable. ${items.length} article(s) détecté(s) dans la réponse.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Échec de connexion';
    return { ok: false, message: msg };
  }
}

export async function testConnection(id: string) {
  const conn = await getConnection(id);
  if (!conn) throw new Error('Connexion introuvable');
  const preset = getProvider(conn.provider);
  if (!preset) throw new Error('Fournisseur inconnu');
  const cfg = conn.config;
  const secrets = conn.secrets;

  if (preset.adapter === 'neumaticos_andres') {
    const login = secrets.login || '';
    const password = secrets.password || '';
    const baseUrl = String(cfg.baseUrl || 'https://backend.genasa.es');
    if (!login || !password) return { ok: false, message: 'Login et mot de passe requis.' };
    await saveNeumaticosCredentials({
      login,
      password,
      baseUrl,
      testMode: Boolean(cfg.testMode),
    });
    try {
      const data = await getStockOne('2055516', String(cfg.postCode || '75001'), {
        login,
        password,
        baseUrl: baseUrl.replace(/\/$/, ''),
        testMode: Boolean(cfg.testMode),
        isConfigured: true,
      });
      const count = Array.isArray(data.articles) ? data.articles.length : 0;
      return { ok: true, message: `Neumáticos Andrés répond (${count} article test).` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Échec du test Andrés' };
    }
  }

  return testRestOrCsv(preset.adapter, cfg, secrets);
}

async function syncRest(id: string, cfg: Record<string, unknown>, secrets: ConnectionSecrets, provider: string): Promise<SyncSummary> {
  const logs: string[] = [];
  const url = `${String(cfg.baseUrl || '').replace(/\/$/, '')}${String(cfg.catalogPath || '/products').startsWith('/') ? '' : '/'}${cfg.catalogPath || '/products'}`;
  const got = await fetchCatalogBuffer(url, cfg, secrets, 'generic_rest');
  const json = JSON.parse(got.buffer.toString('utf8'));
  const items = asArray(cfg.itemsPath ? pick(json, String(cfg.itemsPath)) : json);
  logs.push(`${items.length} article(s) dans le flux.`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const limit = Math.min(2000, Math.max(1, Number(cfg.importLimit) || 500));

  await withAdminContext(async (client) => {
    for (const raw of items.slice(0, limit)) {
      if (!raw || typeof raw !== 'object') {
        skipped++;
        continue;
      }
      try {
        const action = await upsertImportedProduct(client, { id, provider }, mapItem(raw as Record<string, unknown>, cfg));
        if (action === 'inserted') inserted++;
        else if (action === 'updated') updated++;
        else skipped++;
      } catch (e) {
        errors++;
        logs.push(e instanceof Error ? e.message : 'erreur article');
      }
    }
  });

  logs.push(`Terminé : ${inserted} créés, ${updated} mis à jour, ${skipped} ignorés, ${errors} erreurs.`);
  return { scanned: items.length, inserted, updated, skipped, errors, logs };
}

async function syncCsv(id: string, cfg: Record<string, unknown>, secrets: ConnectionSecrets, userId: string): Promise<SyncSummary> {
  const logs: string[] = [];
  const url = String(cfg.catalogUrl || '');
  const got = await fetchCatalogBuffer(url, cfg, secrets, 'generic_csv');
  const csv = got.buffer.toString('utf8');
  const admin = createAdminDbClient();
  const result = await importProductsFromCsvText(csv, admin, userId, logs);

  // Marca os recém-importados sem ligação.
  await withAdminContext(async (client) => {
    await client.query(
      `update public.products
          set supplier_connection_id = $1, updated_at = now()
        where supplier_connection_id is null
          and created_at > now() - interval '10 minutes'`,
      [id]
    );
  });

  return {
    scanned: result.total,
    inserted: result.success,
    updated: 0,
    skipped: 0,
    errors: result.errors,
    logs,
  };
}

export async function syncConnection(id: string, actorUserId: string): Promise<SyncSummary> {
  const conn = await getConnection(id);
  if (!conn) throw new Error('Connexion introuvable');
  const preset = getProvider(conn.provider);
  if (!preset) throw new Error('Fournisseur inconnu');

  await markRun(id, { status: 'running' });

  try {
    let summary: SyncSummary;
    if (preset.adapter === 'neumaticos_andres') {
      if (conn.secrets.login && conn.secrets.password) {
        await saveNeumaticosCredentials({
          login: conn.secrets.login,
          password: conn.secrets.password,
          baseUrl: String(conn.config.baseUrl || ''),
          testMode: Boolean(conn.config.testMode),
        });
      }
      const admin = createAdminDbClient();
      const result = await importNeumaticosCatalog(admin, {
        limit: Number(conn.config.importLimit) || 80,
        postCode: String(conn.config.postCode || '75001'),
      });
      await withAdminContext(async (client) => {
        await client.query(
          `update public.products
              set supplier_connection_id = $1, updated_at = now()
            where external_supplier = 'neumaticos_andres'
              and (supplier_connection_id is null or supplier_connection_id = $1)`,
          [id]
        );
      });
      summary = result;
    } else if (preset.adapter === 'generic_csv') {
      summary = await syncCsv(id, conn.config, conn.secrets, actorUserId);
    } else {
      summary = await syncRest(id, conn.config, conn.secrets, conn.provider);
    }

    await markRun(id, { status: summary.errors && !summary.inserted && !summary.updated ? 'error' : 'ok', summary });
    return summary;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Échec de la synchronisation';
    await markRun(id, { status: 'error', error: message, summary: { logs: [message] } });
    throw e;
  }
}
