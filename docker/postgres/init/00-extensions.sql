create extension if not exists "pgcrypto";

create schema if not exists auth;

-- Substitui auth.uid() do Supabase: lê o utilizador da sessão da app
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;
