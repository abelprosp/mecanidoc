import 'server-only';

import { encryptSecret, decryptSecret } from '@/lib/supplier-api/crypto';
import { withAdminContext } from '@/lib/db/pool';
import { getProvider, SECRET_FIELD_KEYS, type ProviderPreset } from './providers';

export type ConnectionRow = {
  id: string;
  provider: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  secrets_enc: string | null;
  auto_sync: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_summary: Record<string, unknown> | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionPublic = Omit<ConnectionRow, 'secrets_enc'> & {
  hasSecrets: boolean;
  secretHints: Record<string, boolean>;
};

export type ConnectionSecrets = Record<string, string>;

export function splitFields(
  provider: ProviderPreset,
  raw: Record<string, unknown>
): { config: Record<string, unknown>; secrets: ConnectionSecrets } {
  const config: Record<string, unknown> = {};
  const secrets: ConnectionSecrets = {};
  for (const field of provider.fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.secret) secrets[field.key] = String(value);
    else config[field.key] = value;
  }
  // extras livres (mapping avançado)
  for (const [k, v] of Object.entries(raw)) {
    if (provider.fields.some((f) => f.key === k)) continue;
    if (SECRET_FIELD_KEYS.has(k)) {
      if (v) secrets[k] = String(v);
    } else if (v !== undefined) {
      config[k] = v;
    }
  }
  return { config, secrets };
}

export function encryptSecrets(secrets: ConnectionSecrets): string | null {
  const keys = Object.keys(secrets).filter((k) => secrets[k]);
  if (!keys.length) return null;
  return encryptSecret(JSON.stringify(secrets));
}

export function decryptSecrets(enc: string | null | undefined): ConnectionSecrets {
  if (!enc) return {};
  try {
    const json = decryptSecret(enc);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: ConnectionSecrets = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function toPublic(row: ConnectionRow): ConnectionPublic {
  const secrets = decryptSecrets(row.secrets_enc);
  const { secrets_enc: _s, ...rest } = row;
  void _s;
  return {
    ...rest,
    config: row.config || {},
    hasSecrets: Object.keys(secrets).length > 0,
    secretHints: Object.fromEntries(Object.keys(secrets).map((k) => [k, true])),
  };
}

export async function listConnections(): Promise<ConnectionPublic[]> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<ConnectionRow>(
      `select id, provider, name, is_active, config, secrets_enc, auto_sync, sync_interval_minutes,
              last_sync_at, last_sync_status, last_sync_summary, last_error, created_at, updated_at
         from public.supplier_connections
        order by updated_at desc`
    );
    return rows.map(toPublic);
  });
}

export async function getConnection(id: string): Promise<(ConnectionPublic & { secrets: ConnectionSecrets }) | null> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<ConnectionRow>(
      `select * from public.supplier_connections where id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    return { ...toPublic(row), secrets: decryptSecrets(row.secrets_enc) };
  });
}

export type UpsertInput = {
  id?: string;
  provider: string;
  name: string;
  isActive?: boolean;
  autoSync?: boolean;
  syncIntervalMinutes?: number;
  values: Record<string, unknown>;
  createdBy?: string | null;
};

export async function upsertConnection(input: UpsertInput): Promise<ConnectionPublic> {
  const provider = getProvider(input.provider);
  if (!provider) throw new Error('Fournisseur inconnu');

  const { config, secrets } = splitFields(provider, input.values);

  return withAdminContext(async (client) => {
    if (input.id) {
      const { rows: existing } = await client.query<ConnectionRow>(
        `select * from public.supplier_connections where id = $1 for update`,
        [input.id]
      );
      if (!existing[0]) throw new Error('Connexion introuvable');
      const mergedSecrets = { ...decryptSecrets(existing[0].secrets_enc), ...secrets };
      const mergedConfig = { ...(existing[0].config || {}), ...config };
      const { rows } = await client.query<ConnectionRow>(
        `update public.supplier_connections
            set name = $2,
                is_active = $3,
                config = $4::jsonb,
                secrets_enc = $5,
                auto_sync = $6,
                sync_interval_minutes = $7,
                updated_at = now()
          where id = $1
          returning *`,
        [
          input.id,
          input.name.trim() || provider.name,
          input.isActive !== false,
          JSON.stringify(mergedConfig),
          encryptSecrets(mergedSecrets),
          Boolean(input.autoSync),
          Math.min(10080, Math.max(15, Number(input.syncIntervalMinutes) || 1440)),
        ]
      );
      return toPublic(rows[0]);
    }

    const { rows } = await client.query<ConnectionRow>(
      `insert into public.supplier_connections
         (provider, name, is_active, config, secrets_enc, auto_sync, sync_interval_minutes, created_by)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
       returning *`,
      [
        provider.id,
        input.name.trim() || provider.name,
        input.isActive !== false,
        JSON.stringify(config),
        encryptSecrets(secrets),
        Boolean(input.autoSync),
        Math.min(10080, Math.max(15, Number(input.syncIntervalMinutes) || 1440)),
        input.createdBy || null,
      ]
    );
    return toPublic(rows[0]);
  });
}

export async function deleteConnection(id: string): Promise<void> {
  await withAdminContext(async (client) => {
    await client.query(`delete from public.supplier_connections where id = $1`, [id]);
  });
}

export async function markRun(
  id: string,
  result: { status: 'ok' | 'error' | 'running'; summary?: Record<string, unknown>; error?: string }
) {
  await withAdminContext(async (client) => {
    await client.query(
      `update public.supplier_connections
          set last_sync_at = now(),
              last_sync_status = $2,
              last_sync_summary = $3::jsonb,
              last_error = $4,
              updated_at = now()
        where id = $1`,
      [id, result.status, JSON.stringify(result.summary || {}), result.error || null]
    );
    if (result.status !== 'running') {
      await client.query(
        `insert into public.supplier_connection_runs (connection_id, finished_at, status, summary, error)
         values ($1, now(), $2, $3::jsonb, $4)`,
        [id, result.status, JSON.stringify(result.summary || {}), result.error || null]
      );
    }
  });
}

export async function listDueAutoSync(limit = 5): Promise<Array<ConnectionPublic & { secrets: ConnectionSecrets }>> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<ConnectionRow>(
      `select * from public.supplier_connections
        where is_active = true and auto_sync = true
          and (
            last_sync_at is null
            or last_sync_at < now() - (sync_interval_minutes || ' minutes')::interval
          )
        order by last_sync_at nulls first
        limit $1`,
      [limit]
    );
    return rows.map((r) => ({ ...toPublic(r), secrets: decryptSecrets(r.secrets_enc) }));
  });
}
