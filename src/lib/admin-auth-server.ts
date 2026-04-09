import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function requireMasterUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401, error: 'Non autorise' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'master') {
    return { ok: false as const, status: 403, error: 'Acces refuse' };
  }

  return { ok: true as const, user };
}

export async function requireSupplierOrMasterUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401, error: 'Non autorise' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'master' && profile?.role !== 'supplier') {
    return { ok: false as const, status: 403, error: 'Acces refuse' };
  }

  return { ok: true as const, user };
}
