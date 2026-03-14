import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool, makeId } from '@/lib/support-db';

export async function POST(request: NextRequest) {
  try {
    await ensureSupportSchema();
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json().catch(() => ({}));
    const guestToken = typeof body.guestToken === 'string' ? body.guestToken : null;

    const db = getSupportPool();
    const profile = user
      ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      : null;

    let conversation;
    if (user) {
      const result = await db.query(
        `select * from public.support_conversations
         where channel = 'chat' and user_id = $1 and status <> 'closed'
         order by last_message_at desc limit 1`,
        [user.id]
      );
      conversation = result.rows[0];
    } else if (guestToken) {
      const result = await db.query(
        `select * from public.support_conversations
         where channel = 'chat' and guest_token = $1 and status <> 'closed'
         order by last_message_at desc limit 1`,
        [guestToken]
      );
      conversation = result.rows[0];
    }

    if (!conversation) {
      const id = makeId('conv');
      const customerName = typeof profile?.data?.full_name === 'string' ? profile.data.full_name : null;
      const customerEmail = user?.email ?? null;
      const insert = await db.query(
        `insert into public.support_conversations (
          id, user_id, guest_token, subject, channel, status, customer_name, customer_email
        ) values ($1, $2, $3, $4, 'chat', 'open', $5, $6)
        returning *`,
        [id, user?.id ?? null, guestToken, 'Chat do site', customerName, customerEmail]
      );
      conversation = insert.rows[0];

      await db.query(
        `insert into public.support_messages (
          id, conversation_id, sender_type, sender_name, body, is_read
        ) values ($1, $2, 'system', 'MecaniDoc', $3, true)`,
        [makeId('msg'), id, 'Bonjour ! Notre équipe support va vous répondre ici.']
      );
    }

    const messages = await db.query(
      `select id, sender_type, sender_name, sender_email, body, is_read, created_at
       from public.support_messages where conversation_id = $1 order by created_at asc`,
      [conversation.id]
    );

    return NextResponse.json({ conversation, messages: messages.rows });
  } catch (error) {
    console.error('support chat session error', error);
    return NextResponse.json({ error: 'Falha ao abrir sessão de suporte.' }, { status: 500 });
  }
}

