import 'server-only';

import { createAdminDbClient } from '@/lib/db/client';
import { decryptSecret, encryptSecret } from '@/lib/supplier-api/crypto';
import { getNeumaticosAndresConfig, type NeumaticosAndresConfig } from './config';

export type NaCredentialsInput = {
  login?: string | null;
  password?: string | null;
  baseUrl?: string | null;
  testMode?: boolean | null;
  clearPassword?: boolean;
};

export async function resolveNeumaticosAndresConfig(): Promise<NeumaticosAndresConfig> {
  const envConfig = getNeumaticosAndresConfig();
  if (envConfig.isConfigured) {
    return envConfig;
  }

  try {
    const admin = createAdminDbClient();
    const { data } = await admin
      .from('global_settings')
      .select('na_api_login, na_api_password_enc, na_api_base_url, na_api_test_mode')
      .maybeSingle();

    const login = (data?.na_api_login || '').trim();
    let password = '';
    if (data?.na_api_password_enc) {
      try {
        password = decryptSecret(String(data.na_api_password_enc));
      } catch {
        password = '';
      }
    }

    const baseUrl = (
      (data?.na_api_base_url || '').trim() ||
      envConfig.baseUrl ||
      'https://backend.genasa.es'
    ).replace(/\/$/, '');

    const testMode =
      typeof data?.na_api_test_mode === 'boolean'
        ? data.na_api_test_mode
        : envConfig.testMode;

    return {
      login,
      password,
      baseUrl,
      testMode,
      isConfigured: Boolean(login && password),
    };
  } catch {
    return envConfig;
  }
}

export async function getNeumaticosCredentialsStatus() {
  const envConfig = getNeumaticosAndresConfig();
  const admin = createAdminDbClient();
  const { data } = await admin
    .from('global_settings')
    .select('id, na_api_login, na_api_password_enc, na_api_base_url, na_api_test_mode')
    .maybeSingle();

  const resolved = await resolveNeumaticosAndresConfig();

  return {
    configured: resolved.isConfigured,
    source: envConfig.isConfigured ? ('env' as const) : data?.na_api_login ? ('database' as const) : ('none' as const),
    login: resolved.login ? `${resolved.login.slice(0, 2)}***` : null,
    hasPassword: Boolean(resolved.password),
    baseUrl: resolved.baseUrl,
    testMode: resolved.testMode,
    settingsId: data?.id || null,
  };
}

export async function saveNeumaticosCredentials(input: NaCredentialsInput) {
  const admin = createAdminDbClient();
  const { data: existing } = await admin.from('global_settings').select('id, na_api_password_enc').maybeSingle();

  const payload: Record<string, unknown> = {};

  if (input.login !== undefined) {
    payload.na_api_login = input.login?.trim() || null;
  }
  if (input.baseUrl !== undefined) {
    payload.na_api_base_url = input.baseUrl?.trim()?.replace(/\/$/, '') || null;
  }
  if (input.testMode !== undefined && input.testMode !== null) {
    payload.na_api_test_mode = Boolean(input.testMode);
  }
  if (input.clearPassword) {
    payload.na_api_password_enc = null;
  } else if (typeof input.password === 'string' && input.password.trim()) {
    payload.na_api_password_enc = encryptSecret(input.password.trim());
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
