import { NextRequest, NextResponse } from 'next/server';
import {
  getNaIntegrationSettings,
  getSupabaseAdmin,
  isAuthorizedCron,
} from '@/lib/neumaticos-andres/server-helpers';
import { syncNeumaticosAndresStock } from '@/lib/neumaticos-andres/sync-stock';
import { syncNeumaticosAndresTracking } from '@/lib/neumaticos-andres/sync-tracking';

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
    const stock = settings.na_auto_sync_stock
      ? await syncNeumaticosAndresStock(admin)
      : { updated: 0, skipped: 0, errors: 0, logs: ['Auto sync stock desativado.'] };

    const tracking = await syncNeumaticosAndresTracking(admin);

    return NextResponse.json({
      ok: true,
      stock,
      tracking,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha no cron Neumáticos Andrés';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
