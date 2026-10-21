-- SMTP / IMAP configuráveis pelo admin (painel master).
-- Não há SELECT público: só o role master acede (credenciais sensíveis).

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

comment on table public.support_mail_settings is 'Credenciais SMTP/IMAP para inbox support; acesso apenas master via RLS.';
