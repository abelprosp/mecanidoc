import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/pool';
import { dimensionCombos } from '@/lib/catalog/search';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['Toutes', 'Auto', 'Moto', 'Camion', 'Tracteurs']);

/** Combinações de dimensões disponíveis por categoria (usado pelo Hero). */
export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get('category') || 'Auto').trim();
  const category = ALLOWED.has(raw) ? raw : 'Auto';
  try {
    const rows = await withUserContext(null, (client) => dimensionCombos(client, category));
    return NextResponse.json({ data: rows }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
  } catch (e) {
    console.error('products/dimensions:', e);
    return NextResponse.json({ error: 'Indisponible' }, { status: 500 });
  }
}
