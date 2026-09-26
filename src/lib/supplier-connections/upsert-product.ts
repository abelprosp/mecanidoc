import 'server-only';

import type { PoolClient } from 'pg';

export type IncomingProduct = {
  name: string;
  sku?: string | null;
  ean?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  price: number;
  stock?: number | null;
  image?: string | null;
  width?: string | null;
  height?: string | null;
  diameter?: string | null;
  loadIndex?: string | null;
  speedIndex?: string | null;
  season?: string | null;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function money(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number.parseFloat(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function inferCategory(raw: string | null): string {
  const p = (raw || '').toLowerCase();
  if (p.includes('moto') || p.includes('scooter')) return 'Moto';
  if (p.includes('camion') || p.includes('truck') || p.includes('pl') || p.includes('poids')) return 'Camion';
  if (p.includes('tracteur') || p.includes('agri') || p.includes('tractor')) return 'Tracteur';
  return 'Auto';
}

export async function upsertImportedProduct(
  client: PoolClient,
  connection: { id: string; provider: string },
  raw: IncomingProduct
): Promise<'inserted' | 'updated' | 'skipped'> {
  const name = str(raw.name);
  const price = money(raw.price);
  const ean = str(raw.ean);
  const sku = str(raw.sku);
  if (!name || price <= 0) return 'skipped';

  const category = inferCategory(str(raw.category));
  const specs = {
    width: str(raw.width),
    height: str(raw.height),
    diameter: str(raw.diameter),
    load_index: str(raw.loadIndex),
    speed_index: str(raw.speedIndex),
    season: str(raw.season),
  };
  const images = str(raw.image) ? [str(raw.image)] : [];
  const stock = raw.stock == null ? null : Math.max(0, Math.round(Number(raw.stock) || 0));

  const { rows: existing } = await client.query<{ id: string }>(
    `select id from public.products
      where (
        ($1::uuid is not null and supplier_connection_id = $1 and (
          ($2::text is not null and supplier_sku = $2)
          or ($3::text is not null and ean = $3)
        ))
        or ($3::text is not null and ean = $3 and external_supplier = $4)
      )
      order by (supplier_connection_id = $1) desc nulls last
      limit 1`,
    [connection.id, sku, ean, connection.provider]
  );

  const payload = [
    name,
    str(raw.description),
    str(raw.brand),
    category,
    JSON.stringify(specs),
    price,
    stock,
    ean,
    connection.provider,
    sku,
    connection.id,
    sku,
    images,
  ];

  if (existing[0]) {
    await client.query(
      `update public.products set
         name = $1,
         description = coalesce($2, description),
         brand = coalesce($3, brand),
         category = $4,
         specs = $5::jsonb,
         base_price = $6,
         stock_quantity = coalesce($7, stock_quantity),
         ean = coalesce($8, ean),
         external_supplier = $9,
         external_product_id = coalesce($10, external_product_id),
         supplier_connection_id = $11,
         supplier_sku = coalesce($12, supplier_sku),
         images = case when cardinality($13::text[]) > 0 then $13::text[] else images end,
         is_active = true,
         updated_at = now(),
         last_stock_sync_at = now()
       where id = $14`,
      [...payload, existing[0].id]
    );
    return 'updated';
  }

  await client.query(
    `insert into public.products (
       name, description, brand, category, specs, base_price, stock_quantity, ean,
       external_supplier, external_product_id, supplier_connection_id, supplier_sku, images, is_active
     ) values (
       $1, $2, $3, $4, $5::jsonb, $6, coalesce($7, 0), $8, $9, $10, $11, $12, $13::text[], true
     )`,
    payload
  );
  return 'inserted';
}
