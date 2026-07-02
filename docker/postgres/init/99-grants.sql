-- Garantir permissões ao utilizador da app
grant usage on schema public to mecanidoc;
grant all privileges on all tables in schema public to mecanidoc;
grant all privileges on all sequences in schema public to mecanidoc;
alter default privileges in schema public grant all on tables to mecanidoc;
alter default privileges in schema public grant all on sequences to mecanidoc;
