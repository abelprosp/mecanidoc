import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db/pool';
import { listBestsellers } from '@/lib/catalog/bestsellers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await withUserContext(null, (client) =>
      listBestsellers(client, {
        category: searchParams.get('category'),
        paTipo: searchParams.get('pa_tipo'),
        limit: Number(searchParams.get('limit') || 12),
      })
    );
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[products/bestsellers]', error);
    return NextResponse.json({ items: [] });
  }
}
