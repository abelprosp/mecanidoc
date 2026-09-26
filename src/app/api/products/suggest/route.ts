import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/pool';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 10;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;

/**
 * Sugestões de pesquisa do cabeçalho. Substitui as 10 consultas paralelas que o
 * `Header` fazia via `/api/db` por uma única consulta SQL (nome, marca, categoria,
 * tipo e campos de `specs`) com RLS pública.
 */
export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get('q') || '').trim();
  if (raw.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ data: [] });
  }
  if (raw.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'Requête trop longue' }, { status: 400 });
  }

  const rl = rateLimit(`suggest:${clientIp(request)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }

  const like = `%${raw.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const exact = raw.toLowerCase();

  try {
    const rows = await withUserContext(null, async (client) => {
      const res = await client.query(
        `select p.*,
                case when b.id is null then null
                     else json_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url)
                end as brands
           from public.products p
           left join public.brands b on b.id = p.brand_id
          where p.is_active = true
            and (
              p.name ilike $1 escape '\\'
              or p.brand ilike $1 escape '\\'
              or p.category ilike $1 escape '\\'
              or p.pa_tipo ilike $1 escape '\\'
              or lower(p.specs->>'width') = $2
              or lower(p.specs->>'height') = $2
              or lower(p.specs->>'diameter') = $2
              or lower(p.specs->>'load_index') = $2
              or lower(p.specs->>'speed_index') = $2
              or lower(p.specs->>'season') = $2
            )
          order by (p.name ilike $1 escape '\\') desc, p.name asc
          limit $3`,
        [like, exact, MAX_RESULTS]
      );
      return res.rows;
    });
    return NextResponse.json({ data: rows }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('products/suggest:', e);
    return NextResponse.json({ error: 'Recherche indisponible' }, { status: 500 });
  }
}
