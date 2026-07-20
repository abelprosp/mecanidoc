import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/db/client';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password são obrigatórios.' }, { status: 400 });
    }

    const user = await loginUser(email, password);
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro no login';
    // Credenciais inválidas → 401 genérico. Erros de config/BD → 503 para não
    // parecer "password errada" quando falta DATABASE_URL / AUTH_SECRET / Postgres.
    const isCredentials = /invalid login credentials/i.test(msg);
    const isConfig =
      /DATABASE_URL|AUTH_SECRET|JWT_SECRET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(msg);
    const status = isCredentials ? 401 : isConfig ? 503 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
