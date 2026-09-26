import 'server-only';

import { getPool } from '@/lib/db/pool';

let checked = false;

const INTEGRATION_COLUMNS = [
  'na_api_login',
  'na_api_password_enc',
  'na_api_base_url',
  'na_api_test_mode',
  'stripe_secret_key_enc',
  'stripe_publishable_key',
  'stripe_webhook_secret_enc',
];

/**
 * A aplicação já não executa DDL em runtime (o utilizador de ligação não é dono das
 * tabelas). Esta função apenas verifica que as colunas de integração existem e, se
 * faltarem, regista um aviso claro a apontar para a migração.
 */
export async function ensureIntegrationSettingsSchema(): Promise<void> {
  if (checked) return;
  try {
    const { rows } = await getPool().query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'global_settings' and column_name = any($1)`,
      [INTEGRATION_COLUMNS]
    );
    const present = new Set(rows.map((r) => r.column_name));
    const missing = INTEGRATION_COLUMNS.filter((c) => !present.has(c));
    if (missing.length) {
      console.error(
        `[db] global_settings sem colunas ${missing.join(', ')}. ` +
          'Aplique docker/postgres/init/02-schema.sql (secção "Supplier public API keys + NA credentials") via scripts/db-harden.sh.'
      );
    }
    checked = true;
  } catch (error) {
    console.error('ensureIntegrationSettingsSchema: verificação falhou:', error);
  }
}
