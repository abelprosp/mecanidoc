-- Atualização da tabela Garages para incluir todos os campos do formulário
alter table public.garages 
add column if not exists phone_primary text,
add column if not exists phone_secondary text,
add column if not exists siret text,
add column if not exists legal_form text,
add column if not exists company_name text,
add column if not exists tire_types jsonb,
add column if not exists opening_hours text,
add column if not exists country text,
add column if not exists zip_code text,
add column if not exists city text,
add column if not exists street_number text,
add column if not exists address_complement text;

-- Atualizar políticas de segurança se necessário (garantir que garagens possam inserir seus dados)
-- (A política criada anteriormente já permite inserção se autenticado, mas vamos garantir)
create policy "Garages can insert own data"
  on public.garages for insert
  with check ( auth.uid() = profile_id );
