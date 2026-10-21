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

export async function requireGarageUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401, error: 'Non autorisé' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'garage' && profile?.role !== 'master') {
    return { ok: false as const, status: 403, error: 'Accès refusé' };
  }

  const { data: garage } = await supabase.from('garages').select('*').eq('profile_id', user.id).maybeSingle();

  if (!garage && profile?.role !== 'master') {
    return { ok: false as const, status: 403, error: 'Garage introuvable' };
  }

  return { ok: true as const, user, garage: garage as Record<string, unknown> | null, role: String(profile?.role || '') };
}
