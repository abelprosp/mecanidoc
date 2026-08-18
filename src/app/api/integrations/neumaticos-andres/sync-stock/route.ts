import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { syncNeumaticosAndresStock } from '@/lib/neumaticos-andres/sync-stock';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';
import {
  createNaJob,
  failNaJob,
  finishNaJob,
  getRunningNaJob,
  publicNaJob,
  setNaJobLogs,
} from '@/lib/neumaticos-andres/jobs';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const existing = getRunningNaJob('sync-stock');
  if (existing) {
    return NextResponse.json(
      { ok: true, started: true, reused: true, jobId: existing.id, ...publicNaJob(existing) },
      { status: 202 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const postCode = typeof body.postCode === 'string' ? body.postCode : undefined;
  const productIds = Array.isArray(body.productIds)
    ? body.productIds.filter((id: unknown) => typeof id === 'string')
    : undefined;

  const job = createNaJob('sync-stock');
  const jobId = job.id;

  void (async () => {
    try {
      const admin = getSupabaseAdmin();
      const result = await syncNeumaticosAndresStock(admin, {
        postCode,
        productIds,
        onProgress: (snapshot) => {
          setNaJobLogs(jobId, snapshot.logs);
        },
      });
      finishNaJob(jobId, { ok: true, ...result });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha na sincronização de stock';
      failNaJob(jobId, msg);
    }
  })();

  return NextResponse.json(
    { ok: true, started: true, jobId, message: 'Sync de stock a correr em segundo plano.' },
    { status: 202 }
  );
}
