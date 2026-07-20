import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import {
  getNeumaticosCredentialsStatus,
  saveNeumaticosCredentials,
} from '@/lib/neumaticos-andres/credentials';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const status = await getNeumaticosCredentialsStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao ler credenciais';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  try {
    await saveNeumaticosCredentials({
      login: typeof body.login === 'string' ? body.login : undefined,
      password: typeof body.password === 'string' ? body.password : undefined,
      baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
      testMode: typeof body.testMode === 'boolean' ? body.testMode : undefined,
      clearPassword: body.clearPassword === true,
    });

    const status = await getNeumaticosCredentialsStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao guardar credenciais';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
