import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUserFromCookies();
  return NextResponse.json({ user });
}
