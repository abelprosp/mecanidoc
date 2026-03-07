# Variáveis de ambiente (.env) – MecaniDoc

## Para o Next.js ler o `.env`

1. **Ficheiro no sítio certo**  
   O ficheiro deve chamar-se `.env` ou `.env.local` e ficar na **raiz do projeto** (mesma pasta que `package.json`).

2. **Nomes exatos (Supabase)**  
   - `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto (ex: `https://xxxx.supabase.co`)  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – chave “anon” / pública (começa por `eyJ...`)

   Sem o prefixo `NEXT_PUBLIC_` estas variáveis **não** ficam disponíveis no browser e o login pode falhar.

3. **Reiniciar o servidor**  
   Depois de alterar o `.env` ou `.env.local`, pare o `npm run dev` (Ctrl+C) e volte a executar:

   ```bash
   npm run dev
   ```

4. **Sem espaços ou aspas a mais**  
   No `.env` use uma linha por variável, sem espaços à volta do `=` e sem aspas à volta do valor (a não ser que o valor tenha espaços):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://yjdoprfjgaeyvvyhpihd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Se o login der 400 (Bad Request)

- Confirme no **Supabase Dashboard** > **Authentication** > **Users** que o utilizador existe e que o email está **confirmado**.
- Confirme que a **anon key** no `.env` é a do mesmo projeto que a URL (Dashboard > Project Settings > API).
- Teste o login com a mesma senha que definiu no Supabase (ou use “Reset password” no Dashboard).
