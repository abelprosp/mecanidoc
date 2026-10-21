-- Permissões dos papéis da aplicação (ver 01-roles.sh).
-- Só DML: nenhum dos dois papéis pode criar/alterar tabelas — DDL fica para migrações.
-- Idempotente: pode ser re-executado numa base existente.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mecanidoc_admin') then
    raise notice 'Papel mecanidoc_admin inexistente — execute docker/postgres/init/01-roles.sh primeiro.';
    return;
  end if;

  execute 'grant usage on schema public to mecanidoc_app, mecanidoc_admin';
  execute 'grant usage on schema auth to mecanidoc_app, mecanidoc_admin';

  execute 'grant select, insert, update, delete on all tables in schema public to mecanidoc_app, mecanidoc_admin';
  execute 'grant usage, select on all sequences in schema public to mecanidoc_app, mecanidoc_admin';
  execute 'grant execute on all functions in schema public to mecanidoc_app, mecanidoc_admin';
  execute 'grant execute on all functions in schema auth to mecanidoc_app, mecanidoc_admin';

  -- Tabelas criadas mais tarde pelo dono (migrações) herdam as permissões.
  execute 'alter default privileges in schema public grant select, insert, update, delete on tables to mecanidoc_app, mecanidoc_admin';
  execute 'alter default privileges in schema public grant usage, select on sequences to mecanidoc_app, mecanidoc_admin';
  execute 'alter default privileges in schema public grant execute on functions to mecanidoc_app, mecanidoc_admin';

  -- Login (imagem antiga) lê public.users como mecanidoc_app.
  -- Sem GRANT + RLS off, o login devolve 401/500. O papel admin continua a ter acesso total.
  if to_regclass('public.users') is not null then
    execute 'grant select, update on public.users to mecanidoc_app, mecanidoc_admin';
  end if;
  if to_regclass('public.password_reset_tokens') is not null then
    execute 'revoke all on public.password_reset_tokens from mecanidoc_app';
  end if;
  if to_regclass('public.email_verification_tokens') is not null then
    execute 'revoke all on public.email_verification_tokens from mecanidoc_app';
  end if;
  if to_regclass('public.stripe_webhook_events') is not null then
    execute 'revoke all on public.stripe_webhook_events from mecanidoc_app';
  end if;
  if to_regclass('public.supplier_connections') is not null then
    execute 'revoke all on public.supplier_connections from mecanidoc_app';
  end if;
  if to_regclass('public.supplier_connection_runs') is not null then
    execute 'revoke all on public.supplier_connection_runs from mecanidoc_app';
  end if;
end
$$;
