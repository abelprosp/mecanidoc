import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/db/client';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata : {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password são obrigatórios.' }, { status: 400 });
    }

    const user = await registerUser({ email, password, metadata });
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro no registo';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
