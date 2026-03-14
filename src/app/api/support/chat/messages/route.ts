import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool, makeId } from '@/lib/support-db';

async function isAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, user: null, email: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { ok: profile?.role === 'master', user, email: user.email ?? null };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSupportSchema();
    const conversationId = request.nextUrl.searchParams.get('conversationId');
    const guestToken = request.nextUrl.searchParams.get('guestToken');
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const db = getSupportPool();
    const admin = await isAdmin();
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const convoResult = await db.query('select * from public.support_conversations where id = $1', [conversationId]);
    const conversation = convoResult.rows[0];
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const allowed = admin.ok || (user && conversation.user_id === user.id) || (!user && guestToken && conversation.guest_token === guestToken);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const messages = await db.query(
      `select id, sender_type, sender_name, sender_email, body, is_read, created_at
       from public.support_messages where conversation_id = $1 order by created_at asc`,
      [conversationId]
    );

    if (admin.ok) {
      await db.query(
        `update public.support_messages set is_read = true
         where conversation_id = $1 and sender_type = 'customer' and is_read = false`,
        [conversationId]
      );
    }

    return NextResponse.json({ conversation, messages: messages.rows });
  } catch (error) {
    console.error('support chat messages get error', error);
    return NextResponse.json({ error: 'Falha ao buscar mensagens.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSupportSchema();
    const body = await request.json();
    const conversationId = body.conversationId as string;
    const text = body.text as string;
    const guestToken = typeof body.guestToken === 'string' ? body.guestToken : null;
    const senderType = body.senderType === 'admin' ? 'admin' : 'customer';

    if (!conversationId || !text?.trim()) {
      return NextResponse.json({ error: 'conversationId and text required' }, { status: 400 });
    }

    const db = getSupportPool();
    const convoResult = await db.query('select * from public.support_conversations where id = $1', [conversationId]);
    const conversation = convoResult.rows[0];
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const admin = await isAdmin();
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (senderType === 'admin') {
      if (!admin.ok || !admin.user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      const allowed = (user && conversation.user_id === user.id) || (!user && guestToken && conversation.guest_token === guestToken);
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const senderName = senderType === 'admin'
      ? 'Admin MecaniDoc'
      : conversation.customer_name || user?.email || 'Client';
    const senderEmail = senderType === 'admin' ? admin.email : (conversation.customer_email || user?.email || null);

    const insert = await db.query(
      `insert into public.support_messages (
        id, conversation_id, sender_type, sender_name, sender_email, body, is_read
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id, sender_type, sender_name, sender_email, body, is_read, created_at`,
      [makeId('msg'), conversationId, senderType, senderName, senderEmail, text.trim(), senderType === 'admin']
    );

    await db.query(
      `update public.support_conversations
       set status = case when $2 = 'admin' then 'in_progress' else status end,
           assigned_admin_id = case when $2 = 'admin' then $3 else assigned_admin_id end,
           assigned_admin_email = case when $2 = 'admin' then $4 else assigned_admin_email end,
           last_message_at = now(),
           updated_at = now()
       where id = $1`,
      [conversationId, senderType, admin.user?.id ?? null, admin.email]
    );

    return NextResponse.json({ message: insert.rows[0] });
  } catch (error) {
    console.error('support chat message post error', error);
    return NextResponse.json({ error: 'Falha ao enviar mensagem.' }, { status: 500 });
  }
}

