import 'server-only';

import { getPool } from '@/lib/db/pool';

let ready = false;

/** Colunas de integrações adicionadas depois do volume Postgres já existir. */
export async function ensureIntegrationSettingsSchema(): Promise<void> {
  if (ready) return;
  await getPool().query(`
    ALTER TABLE public.global_settings
      ADD COLUMN IF NOT EXISTS na_api_login text,
      ADD COLUMN IF NOT EXISTS na_api_password_enc text,
      ADD COLUMN IF NOT EXISTS na_api_base_url text,
      ADD COLUMN IF NOT EXISTS na_api_test_mode boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS stripe_secret_key_enc text,
      ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
      ADD COLUMN IF NOT EXISTS stripe_webhook_secret_enc text
  `);
  ready = true;
}
