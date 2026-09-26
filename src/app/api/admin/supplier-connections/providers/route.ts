import { NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { PROVIDER_PRESETS } from '@/lib/supplier-connections/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ providers: PROVIDER_PRESETS });
}
