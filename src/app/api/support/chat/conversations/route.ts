import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool } from '@/lib/support-db';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'master') return null;
  return user;
}

export async function GET() {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getSupportPool();
    const result = await db.query(`
      select c.*,
        coalesce((
          select count(*) from public.support_messages m
          where m.conversation_id = c.id and m.sender_type = 'customer' and m.is_read = false
        ), 0) as unread_count,
        (
          select body from public.support_messages m
          where m.conversation_id = c.id
          order by m.created_at desc limit 1
        ) as last_message
      from public.support_conversations c
      where c.channel = 'chat'
      order by c.last_message_at desc
    `);

    return NextResponse.json({ conversations: result.rows });
  } catch (error) {
    console.error('support conversations get error', error);
    return NextResponse.json({ error: 'Falha ao buscar conversas.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { conversationId, status, assignToMe } = body as { conversationId: string; status?: string; assignToMe?: boolean };
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const db = getSupportPool();
    const result = await db.query(
      `update public.support_conversations
       set status = coalesce($2, status),
           assigned_admin_id = case when $3 then $4 else assigned_admin_id end,
           assigned_admin_email = case when $3 then $5 else assigned_admin_email end,
           updated_at = now()
       where id = $1
       returning *`,
      [conversationId, status ?? null, Boolean(assignToMe), admin.id, admin.email ?? null]
    );

    return NextResponse.json({ conversation: result.rows[0] ?? null });
  } catch (error) {
    console.error('support conversations patch error', error);
    return NextResponse.json({ error: 'Falha ao atualizar conversa.' }, { status: 500 });
  }
}

