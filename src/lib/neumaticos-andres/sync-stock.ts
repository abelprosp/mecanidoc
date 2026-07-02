import type { DbClient } from '@/lib/db/client';
import { getStockMany, pickBestSchedule } from './client';
import { getNeumaticosAndresConfig } from './config';
import { NEUMATICOS_ANDRES_SUPPLIER, type SyncStockResult } from './types';

const BATCH_SIZE = 40;

function productLookupId(product: {
  ean?: string | null;
  external_product_id?: string | null;
}): string | null {
  return (product.ean || product.external_product_id || '').trim() || null;
}

export async function syncNeumaticosAndresStock(
  admin: DbClient,
  options?: { postCode?: string; productIds?: string[] }
): Promise<SyncStockResult> {
  const logs: string[] = [];
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  if (!getNeumaticosAndresConfig().isConfigured) {
    throw new Error('Configure NEUMATICOS_ANDRES_LOGIN e NEUMATICOS_ANDRES_PASSWORD.');
  }

  let query = admin
    .from('products')
    .select('id, ean, external_product_id, external_metadata')
    .eq('external_supplier', NEUMATICOS_ANDRES_SUPPLIER)
    .eq('is_active', true);

  if (options?.productIds?.length) {
    query = query.in('id', options.productIds);
  }

  const { data: products, error } = await query;
  if (error) throw error;

  const eligible = (products || []).filter((p: any) => productLookupId(p));
  logs.push(`${eligible.length} produto(s) elegíveis para sync.`);

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const lookupIds = batch.map((p: any) => productLookupId(p)!);

    try {
      const response = await getStockMany(lookupIds, options?.postCode);
      const articles = response.articles || [];

      for (const product of batch) {
        const lookupId = productLookupId(product)!;
        const article =
          articles.find((a) => a.ean === lookupId || a['product-id'] === lookupId) ||
          articles.find((a) => a.ean === product.ean || a['product-id'] === product.external_product_id);

        if (!article || article.success === 0) {
          skipped++;
          const errMsg = article?.errors?.[0]?.['error-message'] || 'Artigo não encontrado';
          logs.push(`Skip ${lookupId}: ${errMsg}`);
          continue;
        }

        const schedule = pickBestSchedule(article['schedule-details'], 1);
        const metadata = {
          ...(typeof product.external_metadata === 'object' && product.external_metadata
            ? product.external_metadata
            : {}),
          supplier_price: article.price ?? null,
          warehouse_code: schedule.warehouseCode ?? null,
          estimated_delivery_date: schedule.deliveryDate ?? null,
          schedule_details: article['schedule-details'] ?? [],
        };

        const { error: updateError } = await admin
          .from('products')
          .update({
            external_product_id: article['product-id'] || product.external_product_id,
            base_price: Number(article.price || 0),
            stock_quantity: Number(article.amount || 0),
            external_metadata: metadata,
            last_stock_sync_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateError) {
          errors++;
          logs.push(`Erro ao atualizar ${lookupId}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    } catch (err) {
      errors += batch.length;
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logs.push(`Erro no lote ${i / BATCH_SIZE + 1}: ${msg}`);
    }
  }

  logs.push(`Sync concluído: ${updated} atualizado(s), ${skipped} ignorado(s), ${errors} erro(s).`);
  return { updated, skipped, errors, logs };
}

export async function markProductsAsNeumaticosAndres(
  admin: DbClient,
  productIds: string[]
): Promise<number> {
  if (!productIds.length) return 0;
  const { data, error } = await admin
    .from('products')
    .update({ external_supplier: NEUMATICOS_ANDRES_SUPPLIER })
    .in('id', productIds)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}
