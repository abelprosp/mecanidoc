import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/auth/email-verification';
import { publicAppUrl } from '@/lib/mailer';

/** Link do e-mail de confirmação → redireciona para o login com o resultado. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const base = publicAppUrl();
  try {
    const result = await verifyEmailToken(token);
    const status = result.ok ? 'ok' : result.reason;
    return NextResponse.redirect(`${base}/auth/login?verified=${status}`, 303);
  } catch (e) {
    console.error('[auth/verify-email]', e);
    return NextResponse.redirect(`${base}/auth/login?verified=error`, 303);
  }
}
