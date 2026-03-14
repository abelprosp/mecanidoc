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
  `);

  schemaReady = true;
}

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

