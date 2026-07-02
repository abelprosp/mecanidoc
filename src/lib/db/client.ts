import 'server-only';

import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { QueryBuilder } from './query-builder';
import { withAdminContext, withUserContext } from './pool';
import { createStorageClient } from '@/lib/storage/local';

type AuthListener = (event: string, session: { user: { id: string; email: string } } | null) => void;

class BrowserAuth {
  private listeners = new Set<AuthListener>();
  private cachedUser: { id: string; email: string } | null = null;

  private emit(event: string, session: { user: { id: string; email: string } } | null) {
    for (const listener of this.listeners) listener(event, session);
  }

  async getSession() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const json = await res.json();
      const user = json.user ?? null;
      this.cachedUser = user;
      return { data: { session: user ? { user } : null }, error: null };
    } catch (error) {
      return { data: { session: null }, error: { message: 'Session fetch failed' } };
    }
  }

  async getUser() {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  }

  async signInWithPassword(credentials: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    const json = await res.json();
    if (!res.ok) return { data: { user: null, session: null }, error: { message: json.error || 'Login failed' } };
    this.cachedUser = json.user;
    this.emit('SIGNED_IN', { user: json.user });
    return { data: { user: json.user, session: { user: json.user } }, error: null };
  }

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        metadata: input.options?.data || {},
      }),
    });
    const json = await res.json();
    if (!res.ok) return { data: { user: null, session: null }, error: { message: json.error || 'Register failed' } };
    this.cachedUser = json.user;
    this.emit('SIGNED_IN', { user: json.user });
    return { data: { user: json.user, session: { user: json.user } }, error: null };
  }

  async signOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    this.cachedUser = null;
    this.emit('SIGNED_OUT', null);
    return { error: null };
  }

  onAuthStateChange(callback: AuthListener) {
    this.listeners.add(callback);
    if (this.cachedUser) callback('INITIAL_SESSION', { user: this.cachedUser });
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }
}

class ServerAuth {
  constructor(private userId?: string | null) {}

  async getUser() {
    if (!this.userId) return { data: { user: null }, error: null };
    return {
      data: { user: { id: this.userId, email: '' } },
      error: null,
    };
  }

  async getSession() {
    const { data } = await this.getUser();
    return { data: { session: data.user ? { user: data.user } : null }, error: null };
  }

  signInWithPassword() {
    return Promise.resolve({ data: null, error: { message: 'Use /api/auth/login' } });
  }

  signUp() {
    return Promise.resolve({ data: null, error: { message: 'Use /api/auth/register' } });
  }

  signOut() {
    return Promise.resolve({ error: null });
  }

  onAuthStateChange() {
    return { data: { subscription: { unsubscribe: () => undefined } } };
  }
}

export type DbClient = {
  from: (table: string) => QueryBuilder;
  auth: BrowserAuth | ServerAuth;
  storage: ReturnType<typeof createStorageClient>;
};

export function createBrowserDbClient(): never {
  throw new Error('Use createBrowserDbClient from @/lib/db/client-browser no browser');
}

export async function createServerDbClient(userId?: string | null): Promise<DbClient> {
  return {
    from(table: string) {
      const builder = new QueryBuilder(table, undefined, userId, false);
      const originalExecute = builder.execute.bind(builder);
      builder.execute = async () =>
        withUserContext(userId, async (client) => {
          builder.setClient(client);
          return originalExecute();
        });
      return builder;
    },
    auth: new ServerAuth(userId),
    storage: createStorageClient(),
  };
}

export function createAdminDbClient(): DbClient {
  const wrap = (builder: QueryBuilder) => {
    const originalExecute = builder.execute.bind(builder);
    builder.execute = async () =>
      withAdminContext(async (client) => {
        builder.setClient(client);
        return originalExecute();
      });
    return builder;
  };

  return {
    from(table: string) {
      return wrap(new QueryBuilder(table, undefined, null, true));
    },
    auth: new ServerAuth(null),
    storage: createStorageClient(),
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
}) {
  return withAdminContext(async (client) => {
    const email = input.email.trim().toLowerCase();
    const existing = await client.query('SELECT id FROM public.users WHERE lower(email) = $1 LIMIT 1', [email]);
    if (existing.rows[0]) {
      throw new Error('User already registered');
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(input.password);
    const fullName = (input.metadata?.full_name as string) || email.split('@')[0];

    await client.query(
      `INSERT INTO public.users (id, email, password_hash, raw_user_meta_data)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [id, email, passwordHash, JSON.stringify(input.metadata || {})]
    );

    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role)
       VALUES ($1, $2, $3, 'customer')
       ON CONFLICT (id) DO NOTHING`,
      [id, email, fullName]
    );

    return { id, email };
  });
}

export async function loginUser(email: string, password: string) {
  return withAdminContext(async (client) => {
    const normalized = email.trim().toLowerCase();
    const { rows } = await client.query<{ id: string; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM public.users WHERE lower(email) = $1 LIMIT 1',
      [normalized]
    );
    const user = rows[0];
    if (!user) throw new Error('Invalid login credentials');
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new Error('Invalid login credentials');
    return { id: user.id, email: user.email };
  });
}

export { verifyPassword, hashPassword };
