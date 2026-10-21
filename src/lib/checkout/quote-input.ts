/**
 * Validação do pedido de orçamento — sem acesso à base de dados.
 * Importável em testes e nas rotas de checkout.
 */

export const MAX_ITEMS = 50;
export const MAX_QTY_PER_ITEM = 20;
export const CURRENCY = 'eur';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeliveryType = 'normal' | 'fast';

export type QuoteItemInput = {
  productId: string;
  quantity: number;
  garageId?: string | null;
};

export class QuoteError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Normaliza e valida o input vindo do browser. Junta linhas repetidas do mesmo produto+garagem. */
export function normalizeQuoteItems(raw: unknown): QuoteItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new QuoteError('EMPTY_CART', 'Votre panier est vide.');
  }
  if (raw.length > MAX_ITEMS) {
    throw new QuoteError('TOO_MANY_ITEMS', `Maximum ${MAX_ITEMS} articles par commande.`);
  }
  const merged = new Map<string, QuoteItemInput>();
  for (const entry of raw) {
    const productId = String((entry as { productId?: unknown })?.productId ?? '').trim();
    const garageRaw = (entry as { garageId?: unknown })?.garageId;
    const garageId = garageRaw == null || garageRaw === '' ? null : String(garageRaw).trim();
    const qty = Number((entry as { quantity?: unknown })?.quantity);

    if (!UUID_RE.test(productId)) throw new QuoteError('INVALID_PRODUCT', 'Article invalide.');
    if (garageId && !UUID_RE.test(garageId)) throw new QuoteError('INVALID_GARAGE', 'Garage invalide.');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      throw new QuoteError('INVALID_QUANTITY', `Quantité invalide (1 à ${MAX_QTY_PER_ITEM}).`);
    }
    const key = `${productId}::${garageId ?? ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(MAX_QTY_PER_ITEM, existing.quantity + qty);
    } else {
      merged.set(key, { productId, quantity: qty, garageId });
    }
  }
  return Array.from(merged.values());
}

export function normalizeDeliveryType(raw: unknown): DeliveryType {
  return raw === 'fast' ? 'fast' : 'normal';
}
