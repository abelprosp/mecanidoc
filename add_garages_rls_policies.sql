-- Garagens: leitura pública só das aprovadas + dono vê a sua; update/delete conforme perfil.
-- Sem política de SELECT, o cliente anónimo não recebe linhas (busca de montagem vazia).

drop policy if exists "Garages approved public read or owner read" on public.garages;
create policy "Garages approved public read or owner read"
  on public.garages
  for select
  using (
    coalesce(is_approved, false) = true
    or profile_id = auth.uid()
  );

drop policy if exists "Master can update any garage" on public.garages;
create policy "Master can update any garage"
  on public.garages
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

drop policy if exists "Garage owner can update own" on public.garages;
create policy "Garage owner can update own"
  on public.garages
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Master can delete garages" on public.garages;
create policy "Master can delete garages"
  on public.garages
  for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );
