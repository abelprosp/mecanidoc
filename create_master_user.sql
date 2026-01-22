-- 1. Habilitar a extensão pgcrypto para gerar hash de senha
create extension if not exists pgcrypto;

-- 2. Inserir o usuário na tabela de autenticação do Supabase (auth.users)
-- Isso simula um cadastro real, mas com email já confirmado
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Verificar se o usuário já existe para não duplicar
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'redobrai@gmail.com') THEN
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'redobrai@gmail.com',
      crypt('Amocarro487@', gen_salt('bf')), -- Senha criptografada
      now(), -- Email confirmado automaticamente
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Master Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 3. O Trigger 'on_auth_user_created' (criado anteriormente) deve rodar aqui e criar o perfil.
    -- Mas para garantir que ele seja MASTER, vamos forçar a atualização logo em seguida.
    
    -- Aguarda um milissegundo para garantir consistência (opcional em bloco único, mas seguro)
    -- Atualiza o perfil para 'master'
    UPDATE public.profiles
    SET role = 'master'
    WHERE id = new_user_id;

  ELSE
    -- Se o usuário já existe, apenas garante que ele seja master
    UPDATE public.profiles
    SET role = 'master'
    WHERE email = 'redobrai@gmail.com';
  END IF;
END $$;
