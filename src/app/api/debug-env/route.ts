import { NextResponse } from 'next/server';

/** Só para desenvolvimento: confirma variáveis de ambiente críticas. */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '(não definido)';
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET || process.env.JWT_SECRET);
  const uploadDir = process.env.UPLOAD_DIR || './uploads';

  return NextResponse.json({
    DATABASE_URL: dbUrl.replace(/:[^:@]+@/, ':***@'),
    AUTH_SECRET: hasAuthSecret ? 'definido' : '(não definido — necessário para login)',
    UPLOAD_DIR: uploadDir,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(não definido)',
  });
}
