import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool } from '@/lib/support-db';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'master' ? user : null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await context.params;
    const db = getSupportPool();
    const threadResult = await db.query('select * from public.support_email_threads where id = $1', [id]);
    const thread = threadResult.rows[0];
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

    const messages = await db.query(
      `select * from public.support_email_messages where thread_id = $1 order by created_at asc`,
      [id]
    );

    return NextResponse.json({ thread, messages: messages.rows });
  } catch (error) {
    console.error('support email thread detail error', error);
    return NextResponse.json({ error: 'Falha ao abrir thread.' }, { status: 500 });
  }
}

