-- Atualiza a senha do usuário redobrai@gmail.com para Amocarro4587@
-- Execute no Supabase SQL Editor (requer permissão para alterar auth.users)

create extension if not exists pgcrypto;

update auth.users
set
  encrypted_password = crypt('Amocarro4587@', gen_salt('bf')),
  updated_at = now()
where email = 'redobrai@gmail.com';
