-- Se a tabela order_items JÁ EXISTE mas a API devolve "not found in schema cache",
-- execute isto no Supabase SQL Editor para dar permissões e recarregar o schema.

grant usage on schema public to anon, authenticated;
grant all on public.order_items to anon, authenticated;
grant all on public.order_items to service_role;
notify pgrst, 'reload schema';
