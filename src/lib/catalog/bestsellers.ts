import 'server-only';

import type { PoolClient } from 'pg';

/**
 * Produits les plus vendus (commandes payées). Repli sur les nouveautés s'il n'y a pas encore de ventes.
 */
export async function listBestsellers(
  client: PoolClient,
  opts: { category?: string | null; paTipo?: string | null; limit?: number } = {}
) {
  const limit = Math.min(24, Math.max(1, opts.limit ?? 12));
  const category = opts.category?.trim() || null;
  const paTipo = opts.paTipo?.trim() || null;

  const { rows } = await client.query(
    `with sold as (
       select oi.product_id, sum(oi.quantity)::int as units
         from public.order_items oi
         join public.orders o on o.id = oi.order_id
        where coalesce(o.payment_status, '') = 'paid'
        group by oi.product_id
     )
     select p.*,
            b.id as brands_id, b.name as brands_name, b.logo_url as brands_logo,
            coalesce(s.units, 0) as units_sold
       from public.products p
       left join public.brands b on b.id = p.brand_id
       left join sold s on s.product_id = p.id
      where coalesce(p.is_active, true) = true
        and ($1::text is null or p.category ilike $1 or coalesce(p.specs->>'vehicle','') ilike $1)
        and ($2::text is null or p.pa_tipo = $2)
      order by coalesce(s.units, 0) desc, p.created_at desc nulls last
      limit $3`,
    [category, paTipo, limit]
  );

  return rows.map((row) => {
    const { brands_id, brands_name, brands_logo, units_sold, ...product } = row as Record<string, unknown>;
    return {
      ...product,
      units_sold,
      brands: brands_id ? { id: brands_id, name: brands_name, logo_url: brands_logo } : null,
    };
  });
}
