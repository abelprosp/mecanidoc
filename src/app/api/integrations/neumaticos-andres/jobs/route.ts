import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { getNaJob, publicNaJob } from '@/lib/neumaticos-andres/jobs';

export async function GET(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const job = getNaJob(id);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }

  return NextResponse.json(publicNaJob(job));
}
