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

  -- A tabela de credenciais nunca é lida pelo papel de utilizador: só via SET ROLE mecanidoc_admin.
  execute 'revoke all on public.users from mecanidoc_app';
  execute 'revoke all on public.password_reset_tokens from mecanidoc_app';
  execute 'revoke all on public.email_verification_tokens from mecanidoc_app';
  execute 'revoke all on public.stripe_webhook_events from mecanidoc_app';
  -- Credenciais de fornecedores: só o servidor (SET ROLE admin) lê/escreve segredos.
  execute 'revoke all on public.supplier_connections from mecanidoc_app';
  execute 'revoke all on public.supplier_connection_runs from mecanidoc_app';
end
$$;
