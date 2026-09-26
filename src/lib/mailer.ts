import 'server-only';

import nodemailer from 'nodemailer';
import { getSupportMailSettings } from '@/lib/support-db';

export type MailConfig = { host: string; port: number; user: string; pass: string; from: string };

/**
 * Resolve a configuração SMTP para e-mails transacionais:
 *   1. SMTP_* (ou SUPPORT_SMTP_*) do ambiente
 *   2. definições SMTP do suporte guardadas no Admin
 */
export async function resolveMailConfig(): Promise<MailConfig | null> {
  const env = (a: string, b: string) => (process.env[a] || process.env[b] || '').trim();
  let host = env('SMTP_HOST', 'SUPPORT_SMTP_HOST');
  let port = Number(env('SMTP_PORT', 'SUPPORT_SMTP_PORT') || 587);
  let user = env('SMTP_USER', 'SUPPORT_SMTP_USER');
  let pass = env('SMTP_PASS', 'SUPPORT_SMTP_PASS');
  let from = env('SMTP_FROM', 'SUPPORT_EMAIL_FROM') || user;

  if (!host) {
    const db = await getSupportMailSettings().catch(() => null);
    if (db?.smtp_host?.trim()) {
      host = db.smtp_host.trim();
      port = Number(db.smtp_port ?? 587);
      user = (db.smtp_user || '').trim();
      pass = (db.smtp_pass || '').trim();
      from = (db.smtp_from || db.smtp_user || '').trim();
    }
  }

  if (!host || !from) return null;
  return { host, port: Number.isFinite(port) ? port : 587, user, pass, from };
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
  const config = await resolveMailConfig();
  if (!config) {
    console.error('[mailer] SMTP non configuré (SMTP_HOST/SMTP_FROM ou Admin → Messagerie support).');
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  await transporter.sendMail({ from: config.from, to: input.to, subject: input.subject, text: input.text, html: input.html });
  return true;
}

/** URL pública da aplicação (para links em e-mails). */
export function publicAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  return (raw || 'http://localhost:3002').replace(/\/$/, '');
}
