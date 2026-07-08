import 'server-only';

import type { DbClient } from '@/lib/db/client';
import { fetchProductByGtin, normalizeGtin } from './client';
import { mapGtinToProductPatch } from './map-to-product';
import { resolveProductNameByNaRef } from './resolve-by-na-ref';
import type { GtinEnrichResult } from './types';

function mergeJson(
  existing: unknown,
  patch: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!patch || !Object.keys(patch).length) return undefined;
  const base =
    typeof existing === 'object' && existing && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch };
}

function hasImages(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim());
}

function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const n = name.toLowerCase();
  return (
    n.includes('exemplo') ||
    n.includes('pneu na ref') ||
    n.startsWith('pneu na ') ||
    n.includes('ref.')
  );
}

function isPlaceholderBrand(brand?: string | null): boolean {
  if (!brand) return true;
  const b = brand.toLowerCase();
  return (
    b.includes('neumáticos andrés') ||
    b.includes('neumaticos andres') ||
    b.includes('exemplo') ||
    b === 'gitigroup' ||
    b === 'giti' ||
    b === 'giti group'
  );
}

function isPlaceholderCategory(category?: string | null): boolean {
  if (!category) return true;
  return category === 'Auto';
}

function isPlaceholderDescription(description?: string | null): boolean {
  if (!description) return true;
  if (description.length < 20) return true;
  const d = description.toLowerCase();
  return (
    d.includes('demonstração') ||
    d.includes('demonstration') ||
    d.includes('exemplo') ||
    d.includes('getstock') ||
    d.includes('importado da api')
  );
}

export async function enrichProductRecord(
  admin: DbClient,
  product: {
    id: string;
    ean?: string | null;
    name?: string | null;
    description?: string | null;
    brand?: string | null;
    category?: string | null;
    images?: string[] | null;
    specs?: unknown;
    labels?: unknown;
    external_metadata?: unknown;
    external_product_id?: string | null;
  },
  options?: { overwriteName?: boolean }
): Promise<GtinEnrichResult> {
  const ean = (product.ean || '').trim();
  if (!ean) {
    return { ok: false, productId: product.id, error: 'Produto sem EAN.' };
  }

  const naRef =
    product.external_product_id ||
    (typeof product.specs === 'object' &&
    product.specs &&
    !Array.isArray(product.specs) &&
    (product.specs as Record<string, unknown>).na_ref
      ? String((product.specs as Record<string, unknown>).na_ref)
      : null);

  const resolved = await resolveProductNameByNaRef({ naRef, ean });
  const lookupEan = resolved.ean || ean;
  const detail = resolved.detail ?? (await fetchProductByGtin(lookupEan, { naRef }));
  if (!detail) {
    return {
      ok: false,
      productId: product.id,
      ean: lookupEan,
      error: resolved.error || 'Produto não encontrado (EPREL / GTIN / heurísticas).',
    };
  }

  const patch = mapGtinToProductPatch(detail);
  const updates: Record<string, unknown> = {};

  if (patch.name && (options?.overwriteName || isPlaceholderName(product.name))) {
    updates.name = patch.name;
  } else if (patch.name && !product.name) {
    updates.name = patch.name;
  }

  if (patch.brand && isPlaceholderBrand(product.brand)) updates.brand = patch.brand;
  if (patch.category && isPlaceholderCategory(product.category)) updates.category = patch.category;
  if (patch.description && isPlaceholderDescription(product.description)) {
    updates.description = patch.description;
  }

  if (patch.images?.length && !hasImages(product.images)) {
    updates.images = patch.images;
  }

  const mergedSpecs = mergeJson(product.specs, patch.specs);
  if (mergedSpecs) updates.specs = mergedSpecs;

  const mergedLabels = mergeJson(product.labels, patch.labels);
  if (mergedLabels) updates.labels = mergedLabels;

  const mergedMeta = mergeJson(product.external_metadata, {
    gtin_enrich: patch.gtinMetadata,
    na_resolve: naRef
      ? {
          naRef,
          ean: lookupEan,
          eanSource: resolved.eanSource,
          resolvedAt: new Date().toISOString(),
        }
      : undefined,
  });
  if (mergedMeta) updates.external_metadata = mergedMeta;

  if (lookupEan !== ean) {
    updates.ean = lookupEan;
  }

  if (!Object.keys(updates).length) {
    return {
      ok: true,
      productId: product.id,
      ean,
      patch,
      source: detail.source,
      skipped: true,
    };
  }

  const { error } = await admin.from('products').update(updates).eq('id', product.id);
  if (error) {
    return { ok: false, productId: product.id, ean, error: error.message };
  }

  return { ok: true, productId: product.id, ean, patch, source: detail.source };
}

export async function enrichProductById(
  admin: DbClient,
  productId: string,
  options?: { overwriteName?: boolean }
): Promise<GtinEnrichResult> {
  const { data, error } = await admin
    .from('products')
    .select('id, ean, name, description, brand, category, images, specs, labels, external_metadata, external_product_id')
    .eq('id', productId)
    .single();

  if (error || !data) {
    return { ok: false, productId, error: error?.message || 'Produto não encontrado.' };
  }

  return enrichProductRecord(admin, data as typeof data & { id: string }, options);
}

export async function enrichProductsBatch(
  admin: DbClient,
  options?: {
    limit?: number;
    externalSupplier?: string;
    onlyMissingName?: boolean;
    overwriteName?: boolean;
  }
): Promise<{ updated: number; skipped: number; errors: number; logs: string[]; results: GtinEnrichResult[] }> {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  let query = admin
    .from('products')
    .select('id, ean, name, description, brand, category, images, specs, labels, external_metadata, external_product_id')
    .eq('is_active', true)
    .not('ean', 'is', null)
    .limit(limit);

  if (options?.externalSupplier) {
    query = query.eq('external_supplier', options.externalSupplier);
  }

  const { data: products, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (products || []).filter((p: { ean?: string | null }) => (p.ean || '').trim());
  const filtered = options?.onlyMissingName
    ? rows.filter((p: { name?: string | null }) => !p.name || p.name.includes('exemplo') || p.name.includes('Ref.'))
    : rows;

  const logs: string[] = [];
  const results: GtinEnrichResult[] = [];
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  logs.push(`${filtered.length} produto(s) elegíveis (limite ${limit}).`);

  for (const product of filtered) {
    try {
      const result = await enrichProductRecord(admin, product as { id: string; ean?: string | null }, options);
      results.push(result);
      if (!result.ok) {
        errors++;
        logs.push(`${product.ean}: ${result.error}`);
      } else if (result.skipped) {
        skipped++;
        logs.push(`${product.ean}: sem alterações (${result.source || '?'}).`);
      } else {
        updated++;
        logs.push(`${product.ean}: enriquecido via ${result.source} → ${result.patch?.name || product.id}`);
      }
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logs.push(`${product.ean}: ${msg}`);
      results.push({ ok: false, productId: product.id, ean: product.ean, error: msg });
    }
  }

  logs.push(`Concluído: ${updated} atualizado(s), ${skipped} ignorado(s), ${errors} erro(s).`);
  return { updated, skipped, errors, logs, results };
}
