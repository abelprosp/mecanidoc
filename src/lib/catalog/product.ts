import 'server-only';

import { withUserContext } from '@/lib/db/pool';
import { calculateFinalPrice } from '@/lib/price-calculator';
import { PRODUCT_PLACEHOLDER } from '@/lib/product-placeholder';

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  final_price: number;
  category: string | null;
  brand: string | null;
  brand_id: string | null;
  images: string[];
  specs: Record<string, unknown>;
  labels: Record<string, unknown>;
  stock_quantity: number | null;
  is_active: boolean | null;
  ean: string | null;
  brands: { id: string; name: string; logo_url: string | null } | null;
};

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  if (!id) return null;
  try {
    return await withUserContext(null, async (client) => {
      const { rows } = await client.query<Record<string, unknown>>(
        `select p.*, b.id as brand_row_id, b.name as brand_row_name, b.logo_url as brand_logo
           from public.products p
           left join public.brands b on b.id = p.brand_id
          where p.id = $1
          limit 1`,
        [id]
      );
      const row = rows[0];
      if (!row) return null;
      const { rows: taxRows } = await client.query<{
        rate: string | number;
        is_percentage: boolean;
        applies_to: string;
        is_active: boolean;
      }>(`select rate, is_percentage, applies_to, is_active from public.taxes where is_active = true`);
      const taxes = taxRows.map((t) => ({
        rate: Number(t.rate) || 0,
        is_percentage: Boolean(t.is_percentage),
        applies_to: String(t.applies_to || 'all'),
        is_active: Boolean(t.is_active),
      }));
      const base = Number(row.base_price) || 0;
      const category = String(row.category || 'Auto');
      const specs = typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs || {};
      const labels = typeof row.labels === 'string' ? JSON.parse(row.labels) : row.labels || {};
      const images = Array.isArray(row.images) ? (row.images as string[]) : [];
      return {
        id: String(row.id),
        name: String(row.name || ''),
        description: row.description ? String(row.description) : null,
        base_price: base,
        final_price: calculateFinalPrice(base, category, taxes),
        category,
        brand: (row.brand_row_name || row.brand) ? String(row.brand_row_name || row.brand) : null,
        brand_id: row.brand_id ? String(row.brand_id) : null,
        images,
        specs: (specs && typeof specs === 'object' ? specs : {}) as Record<string, unknown>,
        labels: (labels && typeof labels === 'object' ? labels : {}) as Record<string, unknown>,
        stock_quantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
        is_active: row.is_active as boolean | null,
        ean: row.ean ? String(row.ean) : null,
        brands: row.brand_row_id
          ? {
              id: String(row.brand_row_id),
              name: String(row.brand_row_name || ''),
              logo_url: row.brand_logo ? String(row.brand_logo) : null,
            }
          : null,
      };
    });
  } catch (error) {
    console.error('[catalog/product]', error);
    return null;
  }
}

export function productImage(product: { images?: string[] | null }): string {
  return product.images?.[0] || PRODUCT_PLACEHOLDER;
}
