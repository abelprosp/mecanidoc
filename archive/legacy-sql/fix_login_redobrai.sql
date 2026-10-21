-- Corrige login para redobrai@gmail.com / Amocarro4587@
-- Executa no Supabase: SQL Editor > colar e Run

create extension if not exists pgcrypto;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'redobrai@gmail.com' LIMIT 1;

  IF uid IS NOT NULL THEN
    -- Utilizador já existe: atualizar senha e garantir email confirmado
    UPDATE auth.users
    SET
      encrypted_password = crypt('Amocarro4587@', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = uid;
    RAISE NOTICE 'Senha atualizada para redobrai@gmail.com';
  ELSE
    -- Criar utilizador
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'redobrai@gmail.com',
      crypt('Amocarro4587@', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Master Admin"}',
      now(),
      now(),
      '', '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (uid, 'redobrai@gmail.com', 'Master Admin', 'master')
    ON CONFLICT (id) DO UPDATE SET role = 'master';
    RAISE NOTICE 'Utilizador criado: redobrai@gmail.com';
  END IF;
END $$;
