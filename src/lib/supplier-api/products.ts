import 'server-only';

import type { DbClient } from '@/lib/db/client';
import type { SupplierApiAuth } from './auth';

export const PRODUCT_PUBLIC_FIELDS =
  'id, name, description, base_price, sale_price, stock_quantity, category, brand, ean, shipping_cost, images, specs, labels, is_active, external_product_id, created_at, last_stock_sync_at';

export type SupplierProductInput = {
  name?: unknown;
  description?: unknown;
  base_price?: unknown;
  sale_price?: unknown;
  stock_quantity?: unknown;
  category?: unknown;
  brand?: unknown;
  ean?: unknown;
  sku?: unknown;
  external_product_id?: unknown;
  shipping_cost?: unknown;
  images?: unknown;
  specs?: unknown;
  labels?: unknown;
  is_active?: unknown;
  pa_tipo?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t || null;
}

function asNumber(value: unknown, fallback?: number): number | null {
  if (value === null || value === undefined || value === '') {
    return fallback === undefined ? null : fallback;
  }
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeProductInput(
  input: SupplierProductInput,
  auth: SupplierApiAuth,
  partial = false
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const name = asString(input.name);
  const basePrice = asNumber(input.base_price);

  if (!partial) {
    if (!name) return { ok: false, error: 'Campo "name" é obrigatório' };
    if (basePrice === null || basePrice < 0) return { ok: false, error: 'Campo "base_price" inválido' };
  } else if (input.name !== undefined && !name) {
    return { ok: false, error: 'Campo "name" inválido' };
  } else if (input.base_price !== undefined && (basePrice === null || basePrice < 0)) {
    return { ok: false, error: 'Campo "base_price" inválido' };
  }

  const externalId =
    asString(input.external_product_id) || asString(input.sku) || null;

  const data: Record<string, unknown> = {
    supplier_id: auth.supplierId,
    supplier_user_id: auth.profileId,
  };

  if (name !== null || !partial) data.name = name;
  if (basePrice !== null || (!partial && input.base_price !== undefined)) data.base_price = basePrice;
  if (input.description !== undefined) data.description = asString(input.description);
  if (input.sale_price !== undefined) data.sale_price = asNumber(input.sale_price);
  if (input.stock_quantity !== undefined) {
    const stock = asNumber(input.stock_quantity, 0);
    data.stock_quantity = stock === null ? 0 : Math.max(0, Math.floor(stock));
  } else if (!partial) {
    data.stock_quantity = 0;
  }
  if (input.category !== undefined || !partial) data.category = asString(input.category);
  if (input.brand !== undefined) data.brand = asString(input.brand);
  if (input.ean !== undefined) data.ean = asString(input.ean);
  if (input.shipping_cost !== undefined || !partial) {
    data.shipping_cost = asNumber(input.shipping_cost, 0) ?? 0;
  }
  if (input.images !== undefined) data.images = asStringArray(input.images) || [];
  if (input.specs !== undefined) data.specs = asObject(input.specs) || {};
  if (input.labels !== undefined) data.labels = asObject(input.labels) || {};
  if (input.is_active !== undefined || !partial) data.is_active = asBool(input.is_active, true);
  if (input.pa_tipo !== undefined) data.pa_tipo = asString(input.pa_tipo);
  if (externalId !== null || input.sku !== undefined || input.external_product_id !== undefined) {
    data.external_product_id = externalId;
  }

  return { ok: true, data };
}

export function serializeProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    sale_price: row.sale_price != null ? Number(row.sale_price) : null,
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : 0,
    category: row.category ?? null,
    brand: row.brand ?? null,
    ean: row.ean ?? null,
    sku: row.external_product_id ?? null,
    shipping_cost: row.shipping_cost != null ? Number(row.shipping_cost) : 0,
    images: Array.isArray(row.images) ? row.images : [],
    specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
    labels: row.labels && typeof row.labels === 'object' ? row.labels : {},
    is_active: Boolean(row.is_active),
    created_at: row.created_at ?? null,
    updated_stock_at: row.last_stock_sync_at ?? null,
  };
}

export async function findSupplierProduct(
  admin: DbClient,
  supplierId: string,
  opts: { id?: string; ean?: string | null; sku?: string | null }
) {
  if (opts.id) {
    const { data } = await admin
      .from('products')
      .select(PRODUCT_PUBLIC_FIELDS)
      .eq('id', opts.id)
      .eq('supplier_id', supplierId)
      .maybeSingle();
    return data;
  }

  if (opts.sku) {
    const { data } = await admin
      .from('products')
      .select(PRODUCT_PUBLIC_FIELDS)
      .eq('supplier_id', supplierId)
      .eq('external_product_id', opts.sku)
      .maybeSingle();
    if (data) return data;
  }

  if (opts.ean) {
    const { data } = await admin
      .from('products')
      .select(PRODUCT_PUBLIC_FIELDS)
      .eq('supplier_id', supplierId)
      .eq('ean', opts.ean)
      .maybeSingle();
    return data;
  }

  return null;
}
