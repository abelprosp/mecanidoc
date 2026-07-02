import type { NaIntegrationSettings } from './types';

export type NeumaticosAndresConfig = {
  login: string;
  password: string;
  baseUrl: string;
  testMode: boolean;
  isConfigured: boolean;
};

export function getNeumaticosAndresConfig(): NeumaticosAndresConfig {
  const login = process.env.NEUMATICOS_ANDRES_LOGIN?.trim() || '';
  const password = process.env.NEUMATICOS_ANDRES_PASSWORD?.trim() || '';
  const baseUrl = (
    process.env.NEUMATICOS_ANDRES_BASE_URL?.trim() || 'https://backend.genasa.es'
  ).replace(/\/$/, '');
  const testMode = process.env.NEUMATICOS_ANDRES_TEST_MODE === '1';

  return {
    login,
    password,
    baseUrl,
    testMode,
    isConfigured: Boolean(login && password),
  };
}

export function isIntegrationEnabled(settings: NaIntegrationSettings | null | undefined): boolean {
  return Boolean(settings?.na_integration_enabled);
}

export function buildCustomerOrderId(orderId: string): string {
  const compact = orderId.replace(/-/g, '');
  return `MD-${compact.slice(0, 32)}`;
}
