import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  // Next.js injeta NEXT_PUBLIC_* em build time; garantir que vêm do ambiente
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    const msg = 'Variáveis Supabase em falta. Verifique o .env: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Reinicie o servidor (npm run dev) após alterar o .env.';
    if (typeof window !== 'undefined') console.error(msg);
    throw new Error(msg);
  }

  return createBrowserClient(url, key);
}
