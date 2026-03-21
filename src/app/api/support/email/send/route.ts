import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureSupportSchema, getSupportMailSettings, getSupportPool, makeId } from '@/lib/support-db';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'master' ? user : null;
}

export async function POST(request: NextRequest) {
  try {
    await ensureSupportSchema();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { threadId, to, subject, body } = await request.json();
    if (!threadId || !to || !subject || !body) {
      return NextResponse.json({ error: 'threadId, to, subject and body are required' }, { status: 400 });
    }

    let host = process.env.SUPPORT_SMTP_HOST || '';
    let port = Number(process.env.SUPPORT_SMTP_PORT || 587);
    let user = process.env.SUPPORT_SMTP_USER || '';
    let pass = process.env.SUPPORT_SMTP_PASS || '';
    let from = (process.env.SUPPORT_EMAIL_FROM || user || '').trim();

    const dbMail = await getSupportMailSettings().catch(() => null);
    if (dbMail?.smtp_host?.trim()) {
      host = dbMail.smtp_host.trim();
      port = Number(dbMail.smtp_port ?? 587);
      user = (dbMail.smtp_user || process.env.SUPPORT_SMTP_USER || '').trim();
      pass = (dbMail.smtp_pass || process.env.SUPPORT_SMTP_PASS || '').trim();
      from = (dbMail.smtp_from || dbMail.smtp_user || process.env.SUPPORT_EMAIL_FROM || user || '').trim();
    }

    if (!host || !user || !pass || !from) {
      return NextResponse.json(
        {
          error:
            'SMTP non configuré : renseignez la section « Messagerie support » dans Configuration Globale (admin) ou les variables SUPPORT_SMTP_*.',
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, text: body });

    const db = getSupportPool();
    await db.query(
      `insert into public.support_email_messages (
        id, thread_id, direction, from_email, to_email, subject, body_text
      ) values ($1, $2, 'outbound', $3, $4, $5, $6)`,
      [makeId('emailmsg'), threadId, from, to, subject, body]
    );
    await db.query(
      `update public.support_email_threads set updated_at = now(), last_message_at = now() where id = $1`,
      [threadId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('support email send error', error);
    return NextResponse.json({ error: 'Falha ao enviar email.' }, { status: 500 });
  }
}

