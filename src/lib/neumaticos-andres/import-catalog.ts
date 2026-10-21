import 'server-only';

import type { DbClient } from '@/lib/db/client';
import { getStockMany } from './client';
import { resolveNeumaticosAndresConfig } from './credentials';
import { buildProductMeta, normalizeEan } from './category-rules';
import { NEUMATICOS_ANDRES_SUPPLIER, type NaStockArticle } from './types';

export type ImportCatalogOptions = {
  /** IDs de artigo (EAN ou product-id) a consultar. */
  articleNumbers?: string[];
  /** Intervalo numérico para varrer refs (quando não há lista). */
  from?: number;
  to?: number;
  limit?: number;
  batchSize?: number;
  postCode?: string;
  delayMs?: number;
  category?: string | null;
  onProgress?: (snapshot: ImportCatalogResult) => void;
};

export type ImportCatalogResult = {
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  logs: string[];
};

function skipReason(article: NaStockArticle): string | null {
  if (article.success !== 1) return 'missing';
  if (!(Number(article.price) > 0)) return 'no_price';
  if (!(Number(article.amount) > 0)) return 'no_stock';
  if (normalizeEan(article.ean).length < 8 && !String(article['product-id'] || '').trim()) {
    return 'no_id';
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertArticle(
  admin: DbClient,
  article: NaStockArticle,
  categoryFilter?: string | null
): Promise<'inserted' | 'updated' | 'skipped'> {
  const productId = String(article['product-id'] || '').trim();
  const ean = normalizeEan(article.ean);
  const price = Number(article.price || 0);
  const stock = Number(article.amount || 0);
  const schedule = article['schedule-details'] || [];
  const meta = buildProductMeta(ean, productId || null);

  if (categoryFilter && meta.category !== categoryFilter) {
    return 'skipped';
  }

  const metadata = {
    source: 'api_import',
    supplier_price: price,
    schedule_details: schedule,
    estimated_delivery_date: schedule[0]?.['delivery-date'] ?? null,
    imported_at: new Date().toISOString(),
    detected_category: meta.category,
  };

  const { data: byExternal } = await admin
    .from('products')
    .select('id')
    .eq('external_supplier', NEUMATICOS_ANDRES_SUPPLIER)
    .eq('external_product_id', productId)
    .maybeSingle();

  let existingId = byExternal?.id as string | undefined;
  if (!existingId && ean) {
    const { data: byEan } = await admin
      .from('products')
      .select('id')
      .eq('external_supplier', NEUMATICOS_ANDRES_SUPPLIER)
      .eq('ean', ean)
      .maybeSingle();
    existingId = byEan?.id;
  }

  const payload = {
    name: meta.name,
    description: meta.description,
    brand: meta.brand,
    category: meta.category,
    specs: meta.specs,
    base_price: price,
    stock_quantity: stock,
    ean,
    external_supplier: NEUMATICOS_ANDRES_SUPPLIER,
    external_product_id: productId || null,
    external_metadata: metadata,
    last_stock_sync_at: new Date().toISOString(),
    is_active: true,
  };

  if (existingId) {
    const { error } = await admin.from('products').update(payload).eq('id', existingId);
    if (error) throw new Error(error.message);
    return 'updated';
  }

  const { error } = await admin.from('products').insert(payload);
  if (error) throw new Error(error.message);
  return 'inserted';
}

/**
 * Puxa pneus/catálogo da API europeia Neumáticos Andrés para a BD MecaniDoc.
 * Aceita lista de artigos ou varredura por intervalo de IDs numéricos.
 */
export async function importNeumaticosCatalog(
  admin: DbClient,
  options: ImportCatalogOptions = {}
): Promise<ImportCatalogResult> {
  const config = await resolveNeumaticosAndresConfig();
  if (!config.isConfigured) {
    throw new Error('Configure as credenciais da API (painel ou .env).');
  }

  const logs: string[] = [];
  let scanned = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000);
  const batchSize = Math.min(Math.max(options.batchSize ?? 25, 1), 50);
  const postCode = options.postCode || '28001';
  const delayMs = Math.max(options.delayMs ?? 150, 0);
  const category = options.category?.trim() || null;
  const skipCounts: Record<string, number> = {};

  let articleNumbers = (options.articleNumbers || [])
    .map((a) => String(a).trim())
    .filter(Boolean);

  if (!articleNumbers.length) {
    let from = Math.max(Number(options.from) || 10000, 1);
    let to = Math.max(Number(options.to) || 80000, 1);
    if (to < from) {
      const swap = from;
      from = to;
      to = swap;
      logs.push(`Intervalo invertido — a varrer ${from}–${to}.`);
    }
    const span = Math.min(to - from + 1, Math.max(limit * 80, 5000));
    articleNumbers = Array.from({ length: span }, (_, i) => String(from + i));
    logs.push(`Varredura de refs Andrés ${from}–${from + span - 1} (limite ${limit} produtos com stock).`);
  } else {
    logs.push(`${articleNumbers.length} artigo(s) pedidos.`);
  }

  for (let i = 0; i < articleNumbers.length; i += batchSize) {
    if (inserted + updated >= limit) break;

    const batch = articleNumbers.slice(i, i + batchSize);
    scanned += batch.length;

    try {
      const response = await getStockMany(batch, postCode, config);
      const articles = response.articles || [];

      for (const article of articles) {
        if (inserted + updated >= limit) break;
        const reason = skipReason(article);
        if (reason) {
          skipped++;
          skipCounts[reason] = (skipCounts[reason] || 0) + 1;
          continue;
        }
        try {
          const action = await upsertArticle(admin, article, category);
          if (action === 'inserted') inserted++;
          else if (action === 'updated') updated++;
          else skipped++;
        } catch (err: unknown) {
          errors++;
          const msg = err instanceof Error ? err.message : 'erro';
          logs.push(`Erro produto ${article.ean || article['product-id']}: ${msg}`);
        }
      }
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : 'erro batch';
      logs.push(`Erro batch ${batch[0]}…: ${msg}`);
    }

    if (delayMs > 0 && i + batchSize < articleNumbers.length) {
      await sleep(delayMs);
    }

    options.onProgress?.({
      scanned,
      inserted,
      updated,
      skipped,
      errors,
      logs: [...logs, `Progresso: ${inserted + updated}/${limit} válidos · varridos ${scanned}`],
    });
  }

  if (skipped) {
    const parts = Object.entries(skipCounts).map(([k, n]) => `${k}=${n}`);
    logs.push(`Ignorados (${skipped}): ${parts.join(', ') || 'sem detalhe'} (missing = ref inexistente na Andrés).`);
  }
  logs.push(
    `Concluído: ${inserted} criados, ${updated} atualizados, ${skipped} ignorados, ${errors} erros (varridos ${scanned}).`
  );

  return { scanned, inserted, updated, skipped, errors, logs };
}
