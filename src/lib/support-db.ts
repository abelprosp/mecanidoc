import { randomUUID } from 'crypto';
import { Pool } from 'pg';

let pool: Pool | null = null;
let schemaReady = false;

export function getSupportPool() {
  if (pool) return pool;

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL não configurado.');
  }

  pool = new Pool({ connectionString });
  return pool;
}

export async function ensureSupportSchema() {
  if (schemaReady) return;

  const db = getSupportPool();
  await db.query(`
    create table if not exists public.support_conversations (
      id text primary key,
      user_id text,
      guest_token text,
      subject text,
      channel text not null default 'chat',
      status text not null default 'open',
      assigned_admin_id text,
      assigned_admin_email text,
      customer_name text,
      customer_email text,
      last_message_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.support_messages (
      id text primary key,
      conversation_id text not null references public.support_conversations(id) on delete cascade,
      sender_type text not null,
      sender_name text,
      sender_email text,
      body text not null,
      metadata jsonb not null default '{}'::jsonb,
      is_read boolean not null default false,
      created_at timestamptz not null default now()
    );

    create table if not exists public.support_email_threads (
      id text primary key,
      external_id text unique,
      subject text,
      from_name text,
      from_email text not null,
      assigned_admin_id text,
      assigned_admin_email text,
      status text not null default 'open',
      preview text,
      last_message_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.support_email_messages (
      id text primary key,
      thread_id text not null references public.support_email_threads(id) on delete cascade,
      external_id text unique,
      direction text not null,
      from_name text,
      from_email text,
      to_email text,
      subject text,
      body_text text,
      body_html text,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_support_conversations_last_message on public.support_conversations(last_message_at desc);
    create index if not exists idx_support_messages_conversation on public.support_messages(conversation_id, created_at asc);
    create index if not exists idx_support_email_threads_last_message on public.support_email_threads(last_message_at desc);
    create index if not exists idx_support_email_messages_thread on public.support_email_messages(thread_id, created_at asc);

    create table if not exists public.support_mail_settings (
      id uuid primary key default gen_random_uuid(),
      smtp_host text,
      smtp_port integer default 587,
      smtp_user text,
      smtp_pass text,
      smtp_from text,
      imap_host text,
      imap_port integer default 993,
      imap_user text,
      imap_pass text,
      imap_mailbox text default 'INBOX',
      updated_at timestamptz not null default timezone('utc'::text, now())
    );

    alter table public.support_mail_settings enable row level security;

    drop policy if exists "Master full access support_mail_settings" on public.support_mail_settings;
    create policy "Master full access support_mail_settings"
      on public.support_mail_settings
      for all
      using (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
      )
      with check (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
      );
  `);

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

/** Lê a primeira linha (pool Postgres; usado nas API routes). */
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

