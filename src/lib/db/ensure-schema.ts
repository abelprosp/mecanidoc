import 'server-only';

import { getPool } from '@/lib/db/pool';

let ready = false;

const INTEGRATION_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: 'na_api_login', ddl: 'text' },
  { name: 'na_api_password_enc', ddl: 'text' },
  { name: 'na_api_base_url', ddl: 'text' },
  { name: 'na_api_test_mode', ddl: 'boolean DEFAULT true' },
  { name: 'stripe_secret_key_enc', ddl: 'text' },
  { name: 'stripe_publishable_key', ddl: 'text' },
  { name: 'stripe_webhook_secret_enc', ddl: 'text' },
];

/** Colunas de integrações adicionadas depois do volume Postgres já existir. */
export async function ensureIntegrationSettingsSchema(): Promise<void> {
  if (ready) return;
  const pool = getPool();
  let allOk = true;
  for (const col of INTEGRATION_COLUMNS) {
    try {
      await pool.query(
        `ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.ddl}`
      );
    } catch (error) {
      allOk = false;
      console.error(`ensureIntegrationSettingsSchema: falha ao adicionar ${col.name}:`, error);
    }
  }
  if (allOk) ready = true;
}
