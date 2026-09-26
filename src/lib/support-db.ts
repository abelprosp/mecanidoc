import 'server-only';

import { randomUUID } from 'crypto';
import { getAdminPool, type AdminQueryable } from '@/lib/db/pool';

let schemaReady = false;

/**
 * Pool com papel administrativo (BYPASSRLS). As tabelas de suporte têm RLS ativo sem
 * políticas, por isso só são acessíveis por aqui — as rotas /api/support fazem a
 * autorização (sessão master, dono da conversa ou token de convidado) antes de consultar.
 */
export function getSupportPool(): AdminQueryable {
  return getAdminPool();
}

const SUPPORT_TABLES = [
  'support_conversations',
  'support_messages',
  'support_email_threads',
  'support_email_messages',
  'support_mail_settings',
];

/**
 * Verifica que as tabelas de suporte existem. O esquema é criado pelas migrações
 * (docker/postgres/init/05-support.sql + 02-schema.sql); a app não executa DDL.
 */
export async function ensureSupportSchema() {
  if (schemaReady) return;
  const { rows } = await getSupportPool().query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1)`,
    [SUPPORT_TABLES]
  );
  const present = new Set(rows.map((r) => r.table_name));
  const missing = SUPPORT_TABLES.filter((t) => !present.has(t));
  if (missing.length) {
    throw new Error(
      `Tabelas de suporte em falta: ${missing.join(', ')}. Execute scripts/db-harden.sh (aplica 05-support.sql).`
    );
  }
  schemaReady = true;
}

export type SupportMailSettings = {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from: string | null;
  imap_host: string | null;
  imap_port: number | null;
  imap_user: string | null;
  imap_pass: string | null;
  imap_mailbox: string | null;
};

export async function getSupportMailSettings(): Promise<SupportMailSettings | null> {
  const db = getSupportPool();
  const { rows } = await db.query(
    `select smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
            imap_host, imap_port, imap_user, imap_pass, imap_mailbox
     from public.support_mail_settings
     order by updated_at desc nulls last
     limit 1`
  );
  return rows[0] || null;
}

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
