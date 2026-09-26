import { NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';

/**
 * Diagnóstico de configuração. Indisponível em produção; fora de produção exige
 * sessão master. Nunca devolve valores de segredos, apenas presença.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  let dbUser = '(não definido)';
  let dbHost = '(não definido)';
  try {
    const u = new URL(dbUrl);
    dbUser = u.username || '(sem utilizador)';
    dbHost = `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    /* URL inválida ou ausente */
  }

  const defined = (name: string) => (process.env[name]?.trim() ? 'definido' : '(não definido)');

  return NextResponse.json({
    DATABASE_USER: dbUser,
    DATABASE_HOST: dbHost,
    DB_ADMIN_ROLE: process.env.DB_ADMIN_ROLE || 'mecanidoc_admin',
    AUTH_SECRET: defined('AUTH_SECRET'),
    CRON_SECRET: defined('CRON_SECRET'),
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(não definido)',
    STRIPE_SECRET_KEY: defined('STRIPE_SECRET_KEY'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: defined('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    STRIPE_WEBHOOK_SECRET: defined('STRIPE_WEBHOOK_SECRET'),
    SMTP_HOST: defined('SMTP_HOST'),
  });
}
