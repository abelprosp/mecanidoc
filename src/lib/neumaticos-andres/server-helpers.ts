import { createAdminDbClient } from '@/lib/db/client';
import type { NaIntegrationSettings } from '@/lib/neumaticos-andres/types';

export function getSupabaseAdmin() {
  return createAdminDbClient();
}

export async function getNaIntegrationSettings(): Promise<NaIntegrationSettings | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('global_settings').select(
    'na_integration_enabled, na_auto_fulfill, na_auto_sync_stock, na_use_consignee, na_consignee_identifier, na_consignee_type'
  ).maybeSingle();
  return data as NaIntegrationSettings | null;
}

export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}
