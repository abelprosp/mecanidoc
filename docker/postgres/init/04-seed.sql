-- Utilizador master (ambiente local / Docker)
-- Email: redobrai@gmail.com | Password: Amocarro487@
insert into public.users (id, email, password_hash, raw_user_meta_data)
values (
  'a1111111-1111-4111-8111-111111111111',
  'redobrai@gmail.com',
  crypt('Amocarro487@', gen_salt('bf')),
  '{"full_name":"Master Admin"}'::jsonb
)
on conflict (email) do nothing;

insert into public.profiles (id, email, full_name, role)
values (
  'a1111111-1111-4111-8111-111111111111',
  'redobrai@gmail.com',
  'Master Admin',
  'master'
)
on conflict (id) do update set role = 'master';
