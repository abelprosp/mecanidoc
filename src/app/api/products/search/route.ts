import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/pool';
import { parseSearchParams, searchProducts } from '@/lib/catalog/search';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rl = rateLimit(`search:${clientIp(request)}`, { limit: 240, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }
  const params = parseSearchParams(request.nextUrl.searchParams);
  try {
    const result = await withUserContext(null, (client) => searchProducts(client, params));
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('products/search:', e);
    return NextResponse.json({ error: 'Recherche indisponible' }, { status: 500 });
  }
}
