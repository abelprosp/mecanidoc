import { NextRequest, NextResponse } from 'next/server';
import {
  getNaIntegrationSettings,
  getSupabaseAdmin,
  isAuthorizedCron,
} from '@/lib/neumaticos-andres/server-helpers';
import { syncNeumaticosAndresStock } from '@/lib/neumaticos-andres/sync-stock';
import { syncNeumaticosAndresTracking } from '@/lib/neumaticos-andres/sync-tracking';
import { retryPendingFulfillments } from '@/lib/stripe-payments';

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getNaIntegrationSettings();
    if (!settings?.na_integration_enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Integração desativada.' });
    }

    const admin = getSupabaseAdmin();

    // 1. Reconciliação: encomendas pagas cujo envio ao fornecedor falhou ou ficou pendente.
    const fulfillment =
      settings.na_auto_fulfill !== false
        ? await retryPendingFulfillments(admin)
        : { retried: 0, ok: 0, failed: 0 };

    const stock = settings.na_auto_sync_stock
      ? await syncNeumaticosAndresStock(admin)
      : { updated: 0, skipped: 0, errors: 0, logs: ['Auto sync stock desativado.'] };

    const tracking = await syncNeumaticosAndresTracking(admin);

    // Ligações génériques (Allopneus, Tyre24, CSV…) marquées « sync auto ».
    let connections: Array<{ id: string; ok: boolean; error?: string }> = [];
    try {
      const { listDueAutoSync } = await import('@/lib/supplier-connections/store');
      const { syncConnection } = await import('@/lib/supplier-connections/sync');
      const due = await listDueAutoSync(4);
      for (const c of due) {
        try {
          await syncConnection(c.id, 'cron');
          connections.push({ id: c.id, ok: true });
        } catch (e) {
          connections.push({ id: c.id, ok: false, error: e instanceof Error ? e.message : 'erreur' });
        }
      }
    } catch (e) {
      connections = [{ id: '-', ok: false, error: e instanceof Error ? e.message : 'sync connexions' }];
    }

    return NextResponse.json({
      ok: true,
      fulfillment,
      stock,
      tracking,
      connections,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha no cron Neumáticos Andrés';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
