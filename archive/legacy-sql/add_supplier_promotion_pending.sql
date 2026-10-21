-- Comptes clients : file d'attente pour promotion fournisseur (visible dans Admin > Approbations)
alter table public.profiles
  add column if not exists supplier_promotion_pending boolean not null default false;

comment on column public.profiles.supplier_promotion_pending is
  'Inscription client normale en attente de validation master pour devenir fournisseur.';

-- Le master peut mettre à jour n'importe quel profil (rôle, file fournisseur, etc.)
drop policy if exists "Master can update any profile" on public.profiles;
create policy "Master can update any profile" on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'master'
    )
  );
