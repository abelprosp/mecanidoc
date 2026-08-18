import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { importNeumaticosCatalog } from '@/lib/neumaticos-andres/import-catalog';
import {
  createNaJob,
  failNaJob,
  finishNaJob,
  getRunningNaJob,
  publicNaJob,
  setNaJobLogs,
} from '@/lib/neumaticos-andres/jobs';

function parseImportBody(body: Record<string, unknown>) {
  const articleNumbers = Array.isArray(body.articleNumbers)
    ? body.articleNumbers.filter((v: unknown) => typeof v === 'string' || typeof v === 'number').map(String)
    : typeof body.articles === 'string'
      ? body.articles
          .split(/[\s,;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : undefined;

  return {
    articleNumbers,
    from: typeof body.from === 'number' ? body.from : Number(body.from) || undefined,
    to: typeof body.to === 'number' ? body.to : Number(body.to) || undefined,
    limit: typeof body.limit === 'number' ? body.limit : Number(body.limit) || 50,
    batchSize: typeof body.batchSize === 'number' ? body.batchSize : undefined,
    postCode: typeof body.postCode === 'string' ? body.postCode : '75001',
    delayMs: typeof body.delayMs === 'number' ? body.delayMs : 150,
    category: typeof body.category === 'string' ? body.category : null,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const options = parseImportBody(body);

  const existing = getRunningNaJob('import-catalog');
  if (existing) {
    return NextResponse.json(
      { ok: true, started: true, reused: true, jobId: existing.id, ...publicNaJob(existing) },
      { status: 202 }
    );
  }

  const job = createNaJob('import-catalog');
  const jobId = job.id;

  void (async () => {
    try {
      const admin = createAdminDbClient();
      const result = await importNeumaticosCatalog(admin, {
        ...options,
        onProgress: (snapshot) => {
          setNaJobLogs(jobId, snapshot.logs);
        },
      });
      finishNaJob(jobId, { ok: true, ...result });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao importar catálogo';
      failNaJob(jobId, msg);
    }
  })();

  return NextResponse.json(
    { ok: true, started: true, jobId, message: 'Importação a correr em segundo plano.' },
    { status: 202 }
  );
}
