import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/pool';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { productQualityOrderSql } from '@/lib/catalog/product-quality';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const rl = rateLimit(`related:${clientIp(request)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

  const params = request.nextUrl.searchParams;
  const productId = params.get('product_id') || '';
  if (!UUID_RE.test(productId)) return NextResponse.json({ error: 'Produit invalide' }, { status: 400 });

  const category = (params.get('category') || '').trim().slice(0, 80);
  const brandIdRaw = params.get('brand_id') || '';
  const brandId = UUID_RE.test(brandIdRaw) ? brandIdRaw : null;
  const brandName = (params.get('brand') || '').trim().slice(0, 80);
  const dimensions = ['width', 'height', 'diameter'] as const;
  const specs = Object.fromEntries(
    dimensions.map((key) => [key, (params.get(key) || '').trim().slice(0, 12)])
  );

  const values: unknown[] = [productId];
  const filters = ['p.is_active = true', 'p.id <> $1::uuid'];
  const add = (clause: (index: string) => string, value: unknown) => {
    values.push(value);
    filters.push(clause(`$${values.length}`));
  };

  if (category) add((i) => `lower(p.category) = lower(${i})`, category);
  if (brandId) add((i) => `p.brand_id = ${i}::uuid`, brandId);
  else if (brandName) add((i) => `p.brand ilike ${i}`, `%${brandName.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  for (const key of dimensions) {
    if (specs[key]) add((i) => `p.specs->>'${key}' = ${i}`, specs[key]);
  }

  try {
    const items = await withUserContext(null, async (client) => {
      const result = await client.query(
        `select p.*,
                case when b.id is null then null
                     else json_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url)
                end as brands
           from public.products p
           left join public.brands b on b.id = p.brand_id
          where ${filters.join(' and ')}
          order by ${productQualityOrderSql('p')}, p.created_at desc nulls last, p.name asc
          limit 12`,
        values
      );
      return result.rows;
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) {
    console.error('[products/related]', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
