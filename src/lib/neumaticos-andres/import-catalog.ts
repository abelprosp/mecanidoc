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
};

export type ImportCatalogResult = {
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  logs: string[];
};

function isValidArticle(article: NaStockArticle): boolean {
  const ean = normalizeEan(article.ean);
  return (
    article.success === 1 &&
    Number(article.price) > 0 &&
    Number(article.amount) > 0 &&
    ean.length >= 8
  );
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

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const batchSize = Math.min(Math.max(options.batchSize ?? 25, 1), 50);
  const postCode = options.postCode || '75001';
  const delayMs = Math.max(options.delayMs ?? 150, 0);
  const category = options.category?.trim() || null;

  let articleNumbers = (options.articleNumbers || [])
    .map((a) => String(a).trim())
    .filter(Boolean);

  if (!articleNumbers.length) {
    const from = Math.max(options.from ?? 100000, 1);
    const to = Math.max(options.to ?? from + limit * 20, from);
    const span = Math.min(to - from + 1, limit * 40);
    articleNumbers = Array.from({ length: span }, (_, i) => String(from + i));
    logs.push(`Varredura de refs ${from}–${from + span - 1} (limite ${limit} produtos válidos).`);
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
        if (!isValidArticle(article)) {
          skipped++;
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
  }

  logs.push(
    `Concluído: ${inserted} criados, ${updated} atualizados, ${skipped} ignorados, ${errors} erros (varridos ${scanned}).`
  );

  return { scanned, inserted, updated, skipped, errors, logs };
}
