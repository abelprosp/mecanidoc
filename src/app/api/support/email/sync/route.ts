import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportPool, makeId } from '@/lib/support-db';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'master' ? user : null;
}

export async function POST() {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const host = process.env.SUPPORT_IMAP_HOST;
    const port = Number(process.env.SUPPORT_IMAP_PORT || 993);
    const user = process.env.SUPPORT_IMAP_USER;
    const pass = process.env.SUPPORT_IMAP_PASS;
    const mailbox = process.env.SUPPORT_IMAP_MAILBOX || 'INBOX';
    if (!host || !user || !pass) {
      return NextResponse.json({ error: 'Configure SUPPORT_IMAP_HOST, SUPPORT_IMAP_PORT, SUPPORT_IMAP_USER e SUPPORT_IMAP_PASS.' }, { status: 503 });
    }

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user, pass },
    });

    await client.connect();
    await client.mailboxOpen(mailbox);
    const lock = await client.getMailboxLock(mailbox);
    const db = getSupportPool();
    let synced = 0;

    try {
      const mailbox = client.mailbox as { exists: number };
      const total = mailbox.exists;
      if (total === 0) {
        return NextResponse.json({ ok: true, synced: 0 });
      }
      const start = Math.max(1, total - 19);
      for await (const message of client.fetch(`${start}:${total}`, { uid: true, envelope: true, source: true })) {
        const externalId = String(message.uid);
        const exists = await db.query('select id from public.support_email_messages where external_id = $1 limit 1', [externalId]);
        if (exists.rows[0]) continue;

        const parsed = message.source ? await simpleParser(message.source) : null;
        const fromAddress = parsed?.from?.value?.[0]?.address || message.envelope?.from?.[0]?.address || 'unknown@example.com';
        const fromName = parsed?.from?.value?.[0]?.name || message.envelope?.from?.[0]?.name || null;
        const subject = parsed?.subject || message.envelope?.subject || '(Sem assunto)';
        const bodyText = parsed?.text || '';
        const bodyHtml = typeof parsed?.html === 'string' ? parsed.html : null;
        const preview = bodyText.slice(0, 180);

        let threadId: string;
        const threadByEmail = await db.query(
          `select id from public.support_email_threads where from_email = $1 and subject = $2 order by last_message_at desc limit 1`,
          [fromAddress, subject]
        );
        if (threadByEmail.rows[0]) {
          threadId = threadByEmail.rows[0].id;
          await db.query(
            `update public.support_email_threads set preview = $2, last_message_at = now(), updated_at = now() where id = $1`,
            [threadId, preview]
          );
        } else {
          threadId = makeId('thread');
          await db.query(
            `insert into public.support_email_threads (
              id, external_id, subject, from_name, from_email, preview
            ) values ($1, $2, $3, $4, $5, $6)`,
            [threadId, externalId, subject, fromName, fromAddress, preview]
          );
        }

        await db.query(
          `insert into public.support_email_messages (
            id, thread_id, external_id, direction, from_name, from_email, to_email, subject, body_text, body_html, created_at
          ) values ($1, $2, $3, 'inbound', $4, $5, $6, $7, $8, $9, now())`,
          [makeId('emailmsg'), threadId, externalId, fromName, fromAddress, user, subject, bodyText, bodyHtml]
        );
        synced += 1;
      }
    } finally {
      lock.release();
      await client.logout();
    }

    return NextResponse.json({ ok: true, synced });
  } catch (error) {
    console.error('support email sync error', error);
    return NextResponse.json({ error: 'Falha ao sincronizar emails.' }, { status: 500 });
  }
}

