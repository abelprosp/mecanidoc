import { getNeumaticosAndresConfig } from './config';
import type {
  NaCreateOrderRequest,
  NaCreateOrderResponse,
  NaGetStockResponse,
  NaOrderStatusResponse,
  NaTrackInfoResponse,
} from './types';

export class NeumaticosAndresApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'NeumaticosAndresApiError';
    this.status = status;
    this.body = body;
  }
}

function buildHeaders(): HeadersInit {
  const config = getNeumaticosAndresConfig();
  return {
    login: config.login,
    password: config.password,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new NeumaticosAndresApiError(
      `Resposta inválida da API (${response.status})`,
      response.status,
      text
    );
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getNeumaticosAndresConfig();
  if (!config.isConfigured) {
    throw new Error('Credenciais Neumáticos Andrés não configuradas.');
  }

  const url = `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const body = await parseJson<T>(response);
  if (!response.ok) {
    throw new NeumaticosAndresApiError(
      `Erro HTTP ${response.status} na API Neumáticos Andrés`,
      response.status,
      body
    );
  }
  return body;
}

export async function getStockOne(articleNumber: string, postCode?: string): Promise<NaGetStockResponse> {
  const query = postCode ? `?post-code=${encodeURIComponent(postCode)}` : '';
  return request<NaGetStockResponse>(`/api/na/getstock/${encodeURIComponent(articleNumber)}${query}`);
}

export async function getStockMany(
  articleNumbers: string[],
  postCode?: string
): Promise<NaGetStockResponse> {
  const params = new URLSearchParams();
  for (const article of articleNumbers) {
    params.append('article_numbers[]', article);
  }
  if (postCode) params.set('post-code', postCode);
  return request<NaGetStockResponse>(`/api/na/getstock/?${params.toString()}`);
}

export async function createOrder(payload: NaCreateOrderRequest): Promise<NaCreateOrderResponse> {
  return request<NaCreateOrderResponse>('/api/na/createorder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTrackInfoOne(orderId: string, testMode = false): Promise<NaTrackInfoResponse> {
  const query = testMode ? '?test_mode=1' : '';
  return request<NaTrackInfoResponse>(`/api/na/trackinfo/${encodeURIComponent(orderId)}${query}`);
}

export async function getTrackInfoMany(orderIds: string[], testMode = false): Promise<NaTrackInfoResponse> {
  const params = new URLSearchParams();
  for (const id of orderIds) params.append('order_ids[]', id);
  if (testMode) params.set('test_mode', '1');
  return request<NaTrackInfoResponse>(`/api/na/trackinfo/?${params.toString()}`);
}

export async function getOrderStatusOne(orderId: string, testMode = false): Promise<NaOrderStatusResponse> {
  const query = testMode ? '?test_mode=1' : '';
  return request<NaOrderStatusResponse>(`/api/na/orderstatus/${encodeURIComponent(orderId)}${query}`);
}

export async function getOrderStatusMany(
  orderIds: string[],
  testMode = false
): Promise<NaOrderStatusResponse> {
  const params = new URLSearchParams();
  for (const id of orderIds) params.append('order_ids[]', id);
  if (testMode) params.set('test_mode', '1');
  return request<NaOrderStatusResponse>(`/api/na/orderstatus/?${params.toString()}`);
}

export function pickBestSchedule(
  scheduleDetails: Array<{ amount?: number; 'warehouse-code'?: string; 'delivery-date'?: string }> | undefined,
  requestedAmount: number
): { warehouseCode?: string; deliveryDate?: string } {
  const rows = (scheduleDetails || [])
    .filter((row) => Number(row.amount || 0) >= requestedAmount)
    .sort((a, b) => {
      const da = a['delivery-date'] || '9999-12-31';
      const db = b['delivery-date'] || '9999-12-31';
      return da.localeCompare(db);
    });

  const best = rows[0] || scheduleDetails?.[0];
  return {
    warehouseCode: best?.['warehouse-code'],
    deliveryDate: best?.['delivery-date'],
  };
}
