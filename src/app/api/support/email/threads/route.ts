import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool } from '@/lib/support-db';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'master' ? user : null;
}

export async function GET() {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getSupportPool();
    const result = await db.query(`
      select t.*,
        coalesce((
          select count(*) from public.support_email_messages m
          where m.thread_id = t.id and m.direction = 'inbound'
        ), 0) as messages_count
      from public.support_email_threads t
      order by t.last_message_at desc
    `);

    return NextResponse.json({ threads: result.rows });
  } catch (error) {
    console.error('support email threads error', error);
    return NextResponse.json({ error: 'Falha ao buscar inbox.' }, { status: 500 });
  }
}

