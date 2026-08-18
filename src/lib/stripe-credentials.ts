import 'server-only';

import { createAdminDbClient } from '@/lib/db/client';
import { getPool } from '@/lib/db/pool';
import { decryptSecret, encryptSecret } from '@/lib/supplier-api/crypto';

export type StripeResolvedConfig = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  source: 'env' | 'database' | 'mixed' | 'none';
  isConfigured: boolean;
  canCharge: boolean;
};

export type StripeCredentialsInput = {
  secretKey?: string | null;
  publishableKey?: string | null;
  webhookSecret?: string | null;
  clearSecretKey?: boolean;
  clearWebhookSecret?: boolean;
};

let schemaReady = false;

export async function ensureStripeSettingsSchema(): Promise<void> {
  if (schemaReady) return;
  await getPool().query(`
    ALTER TABLE public.global_settings
      ADD COLUMN IF NOT EXISTS stripe_secret_key_enc text,
      ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
      ADD COLUMN IF NOT EXISTS stripe_webhook_secret_enc text
  `);
  schemaReady = true;
}

function trimEnv(name: string): string {
  return (process.env[name] || '').trim();
}

function maskKey(value: string | null | undefined): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (v.length <= 10) return `${v.slice(0, 4)}…`;
  return `${v.slice(0, 7)}…${v.slice(-4)}`;
}

export async function resolveStripeConfig(): Promise<StripeResolvedConfig> {
  const envSecret = trimEnv('STRIPE_SECRET_KEY');
  const envPublishable = trimEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  const envWebhook = trimEnv('STRIPE_WEBHOOK_SECRET');

  let dbSecret = '';
  let dbPublishable = '';
  let dbWebhook = '';

  if (!envSecret || !envPublishable || !envWebhook) {
    try {
      await ensureStripeSettingsSchema();
      const admin = createAdminDbClient();
      const { data } = await admin
        .from('global_settings')
        .select('stripe_secret_key_enc, stripe_publishable_key, stripe_webhook_secret_enc')
        .maybeSingle();

      if (data?.stripe_secret_key_enc) {
        try {
          dbSecret = decryptSecret(String(data.stripe_secret_key_enc));
        } catch {
          dbSecret = '';
        }
      }
      dbPublishable = String(data?.stripe_publishable_key || '').trim();
      if (data?.stripe_webhook_secret_enc) {
        try {
          dbWebhook = decryptSecret(String(data.stripe_webhook_secret_enc));
        } catch {
          dbWebhook = '';
        }
      }
    } catch (error) {
      console.warn('Stripe: não foi possível ler chaves da base:', error);
    }
  }

  const secretKey = envSecret || dbSecret;
  const publishableKey = envPublishable || dbPublishable;
  const webhookSecret = envWebhook || dbWebhook;

  const envUsed = Boolean(envSecret || envPublishable || envWebhook);
  const dbUsed = Boolean(
    (!envSecret && dbSecret) || (!envPublishable && dbPublishable) || (!envWebhook && dbWebhook)
  );

  let source: StripeResolvedConfig['source'] = 'none';
  if (envUsed && dbUsed) source = 'mixed';
  else if (envUsed) source = 'env';
  else if (dbUsed) source = 'database';

  const canCharge = Boolean(secretKey && publishableKey);

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    source,
    isConfigured: canCharge,
    canCharge,
  };
}

export async function getStripeCredentialsStatus() {
  const resolved = await resolveStripeConfig();
  const envLocked = Boolean(trimEnv('STRIPE_SECRET_KEY') || trimEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'));

  return {
    configured: resolved.canCharge,
    webhookConfigured: Boolean(resolved.webhookSecret),
    source: resolved.source,
    envLocked,
    publishableKey: maskKey(resolved.publishableKey),
    hasSecretKey: Boolean(resolved.secretKey),
    hasWebhookSecret: Boolean(resolved.webhookSecret),
    livemode: resolved.secretKey.startsWith('sk_live_') || resolved.publishableKey.startsWith('pk_live_'),
  };
}

export async function saveStripeCredentials(input: StripeCredentialsInput) {
  await ensureStripeSettingsSchema();
  const admin = createAdminDbClient();
  const { data: existing } = await admin
    .from('global_settings')
    .select('id')
    .maybeSingle();

  const payload: Record<string, unknown> = {};

  if (input.publishableKey !== undefined) {
    payload.stripe_publishable_key = input.publishableKey?.trim() || null;
  }
  if (input.clearSecretKey) {
    payload.stripe_secret_key_enc = null;
  } else if (typeof input.secretKey === 'string' && input.secretKey.trim()) {
    payload.stripe_secret_key_enc = encryptSecret(input.secretKey.trim());
  }
  if (input.clearWebhookSecret) {
    payload.stripe_webhook_secret_enc = null;
  } else if (typeof input.webhookSecret === 'string' && input.webhookSecret.trim()) {
    payload.stripe_webhook_secret_enc = encryptSecret(input.webhookSecret.trim());
  }

  if (!Object.keys(payload).length) {
    return { ok: true as const, message: 'Nada a atualizar' };
  }

  if (existing?.id) {
    const { error } = await admin.from('global_settings').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from('global_settings').insert([payload]);
    if (error) throw new Error(error.message);
  }

  return { ok: true as const };
}
