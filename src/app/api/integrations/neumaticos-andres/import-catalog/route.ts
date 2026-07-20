import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { importNeumaticosCatalog } from '@/lib/neumaticos-andres/import-catalog';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  const articleNumbers = Array.isArray(body.articleNumbers)
    ? body.articleNumbers.filter((v: unknown) => typeof v === 'string' || typeof v === 'number').map(String)
    : typeof body.articles === 'string'
      ? body.articles
          .split(/[\s,;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : undefined;

  try {
    const admin = createAdminDbClient();
    const result = await importNeumaticosCatalog(admin, {
      articleNumbers,
      from: typeof body.from === 'number' ? body.from : Number(body.from) || undefined,
      to: typeof body.to === 'number' ? body.to : Number(body.to) || undefined,
      limit: typeof body.limit === 'number' ? body.limit : Number(body.limit) || 50,
      batchSize: typeof body.batchSize === 'number' ? body.batchSize : undefined,
      postCode: typeof body.postCode === 'string' ? body.postCode : '75001',
      delayMs: typeof body.delayMs === 'number' ? body.delayMs : 150,
      category: typeof body.category === 'string' ? body.category : null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao importar catálogo';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
