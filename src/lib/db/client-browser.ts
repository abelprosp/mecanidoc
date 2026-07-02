type Filter = {
  type: 'eq' | 'in' | 'not' | 'gte' | 'lte' | 'ilike' | 'neq' | 'or';
  column: string;
  value: unknown;
  op?: string;
};

type OrderBy = { column: string; ascending: boolean };

export type DbResult<T = any> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

class BrowserQueryBuilder {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectRaw = '*';
  private countOnly = false;
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private limitN: number | null = null;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  private serialize() {
    return {
      table: this.table,
      operation: this.operation,
      select: this.selectRaw,
      countOnly: this.countOnly,
      payload: this.payload ?? undefined,
      filters: this.filters,
      orders: this.orders,
      limit: this.limitN ?? undefined,
      singleMode: this.singleMode,
    };
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.operation = 'select';
    this.selectRaw = columns;
    if (options?.count === 'exact' && options?.head) this.countOnly = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'upsert';
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ type: 'not', column, value, op });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  or(filter: string) {
    this.filters.push({ type: 'or', column: '', value: filter });
    return this;
  }

  contains(column: string, value: Record<string, unknown>) {
    this.filters.push({ type: 'eq', column, value: JSON.stringify(value), op: 'contains' });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<DbResult> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.serialize()),
      });
      return (await res.json()) as DbResult;
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'DB request failed' },
      };
    }
  }
}

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
    } catch {
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

export type BrowserDbClient = {
  from: (table: string) => BrowserQueryBuilder;
  auth: BrowserAuth;
};

export function createBrowserDbClient(): BrowserDbClient {
  return {
    from(table: string) {
      return new BrowserQueryBuilder(table);
    },
    auth: new BrowserAuth(),
  };
}
