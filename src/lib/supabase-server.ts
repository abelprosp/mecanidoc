import { getSessionUserFromCookies } from '@/lib/auth/session';
import { createServerDbClient, type DbClient } from '@/lib/db/client';

export async function createServerSupabaseClient(): Promise<DbClient> {
  const session = await getSessionUserFromCookies();
  const client = await createServerDbClient(session?.id ?? null);

  const auth = client.auth as {
    getUser: () => Promise<{ data: { user: { id: string; email: string } | null }; error: null }>;
    getSession: () => Promise<{ data: { session: { user: { id: string; email: string } } | null }; error: null }>;
  };

  auth.getUser = async () => ({
    data: { user: session ? { id: session.id, email: session.email } : null },
    error: null,
  });

  auth.getSession = async () => ({
    data: { session: session ? { user: { id: session.id, email: session.email } } : null },
    error: null,
  });

  return client;
}
