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

/** Papéis que um utilizador pode escolher no registo. `supplier` e `master` são atribuídos pelo master. */
export const SELF_SERVICE_ROLES = ['customer', 'garage', 'company'] as const;
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export type GarageRegistration = {
  name: string;
  address: string;
  streetNumber?: string;
  addressComplement?: string;
  zipCode: string;
  city: string;
  country: string;
  phonePrimary: string;
  phoneSecondary?: string;
  companyName: string;
  siret: string;
  legalForm: string;
  tireTypes: Record<string, boolean>;
  openingHours?: string;
};

export type CompanyRegistration = {
  companyName: string;
  vatNumber?: string;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: SelfServiceRole;
  phone?: string;
  garage?: GarageRegistration;
  company?: CompanyRegistration;
};

export class RegistrationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Cria utilizador + perfil (+ garagem/empresa) numa única transação. O papel é
 * validado no servidor; garagens começam por aprovar e empresas sem desconto.
 */
export async function registerUser(input: RegisterUserInput) {
  if (!SELF_SERVICE_ROLES.includes(input.role)) {
    throw new RegistrationError('Rôle non autorisé.', 400);
  }
  if (input.role === 'garage' && !input.garage) {
    throw new RegistrationError('Informations du garage manquantes.', 400);
  }
  if (input.role === 'company' && !input.company) {
    throw new RegistrationError("Informations de l'entreprise manquantes.", 400);
  }

  return withAdminContext(async (client) => {
    const email = input.email.trim().toLowerCase();
    const existing = await client.query('SELECT id FROM public.users WHERE lower(email) = $1 LIMIT 1', [email]);
    if (existing.rows[0]) {
      throw new RegistrationError('Un compte existe déjà avec cet e-mail.', 409);
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(input.password);
    const fullName = input.fullName.trim() || email.split('@')[0];
    const metadata = { full_name: fullName, role: input.role };

    // email_confirmed_at fica NULL até o utilizador clicar no link de verificação.
    await client.query(
      `INSERT INTO public.users (id, email, password_hash, raw_user_meta_data, email_confirmed_at)
       VALUES ($1, $2, $3, $4::jsonb, NULL)`,
      [id, email, passwordHash, JSON.stringify(metadata)]
    );

    // Clientes entram na fila de aprovação do master (promoção a fornecedor) — comportamento existente.
    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role, phone, supplier_promotion_pending)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, email, fullName, input.role, input.phone?.trim() || null, input.role === 'customer']
    );

    if (input.role === 'garage' && input.garage) {
      const g = input.garage;
      await client.query(
        `INSERT INTO public.garages (
           profile_id, name, address, street_number, address_complement, zip_code, city, country,
           phone_primary, phone_secondary, company_name, siret, legal_form, tire_types, opening_hours,
           is_approved, installation_price, commission_balance
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, false, 0, 0)`,
        [
          id,
          g.name,
          g.address,
          g.streetNumber || null,
          g.addressComplement || null,
          g.zipCode,
          g.city,
          g.country,
          g.phonePrimary,
          g.phoneSecondary || null,
          g.companyName,
          g.siret,
          g.legalForm,
          JSON.stringify(g.tireTypes || {}),
          g.openingHours || null,
        ]
      );
    }

    if (input.role === 'company' && input.company) {
      await client.query(
        `INSERT INTO public.companies (profile_id, company_name, vat_number, discount_tier)
         VALUES ($1, $2, $3, 0)`,
        [id, input.company.companyName, input.company.vatNumber || null]
      );
    }

    return { id, email, role: input.role };
  });
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  sessionVersion: number;
  mfaEnabled: boolean;
  emailConfirmed: boolean;
};

export async function loginUser(email: string, password: string): Promise<AuthenticatedUser> {
  return withAdminContext(async (client) => {
    const normalized = email.trim().toLowerCase();
    const { rows } = await client.query<{
      id: string;
      email: string;
      password_hash: string;
      session_version: number | null;
      mfa_enabled: boolean | null;
      email_confirmed_at: Date | null;
    }>(
      `SELECT id, email, password_hash, session_version, mfa_enabled, email_confirmed_at
         FROM public.users WHERE lower(email) = $1 LIMIT 1`,
      [normalized]
    );
    const user = rows[0];
    if (!user) throw new Error('Invalid login credentials');
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new Error('Invalid login credentials');
    return {
      id: user.id,
      email: user.email,
      sessionVersion: Number(user.session_version ?? 1),
      mfaEnabled: Boolean(user.mfa_enabled),
      emailConfirmed: user.email_confirmed_at !== null,
    };
  });
}

export { verifyPassword, hashPassword };
