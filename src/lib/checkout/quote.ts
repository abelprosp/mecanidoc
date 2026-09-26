import 'server-only';

import type { PoolClient } from 'pg';
import { calculateFinalPrice } from '@/lib/price-calculator';

/**
 * Orçamento calculado exclusivamente no servidor.
 * O browser envia apenas identificadores, quantidades e opções; preços, taxas,
 * descontos, montagem, frete e seguro são recarregados da base de dados.
 */

export const MAX_ITEMS = 50;
export const MAX_QTY_PER_ITEM = 20;
export const CURRENCY = 'eur';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeliveryType = 'normal' | 'fast';

export type QuoteItemInput = {
  productId: string;
  quantity: number;
  garageId?: string | null;
};

export type QuoteInput = {
  items: QuoteItemInput[];
  deliveryType: DeliveryType;
  warranty: boolean;
  userId: string;
};

export type QuoteLine = {
  productId: string;
  productName: string;
  category: string | null;
  quantity: number;
  unitBasePrice: number;
  unitPrice: number;
  lineTotal: number;
  garageId: string | null;
  garageName: string | null;
  installationPrice: number;
  installationTotal: number;
  externalSupplier: string | null;
};

export type Quote = {
  currency: string;
  lines: QuoteLine[];
  totalTires: number;
  subtotal: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  installationFee: number;
  deliveryType: DeliveryType;
  deliveryFee: number;
  warrantyIncluded: boolean;
  warrantyFeePerUnit: number;
  warrantyFee: number;
  total: number;
  totalCents: number;
  settings: {
    deliveryBaseFee: number;
    fastDeliveryFee: number;
    fastDeliveryFeeBulk: number;
    fastDeliveryBulkMinQty: number;
    freeStandardDeliveryMinQty: number;
    warrantyFee: number;
  };
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

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

type ProductRow = {
  id: string;
  name: string;
  base_price: string | number;
  category: string | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  external_supplier: string | null;
};

type TaxRow = { rate: string | number; is_percentage: boolean; applies_to: string; is_active: boolean; name?: string };

type GarageRow = { id: string; name: string; installation_price: string | number | null; is_approved: boolean | null };

type SettingsRow = {
  delivery_base_fee: string | number | null;
  fast_delivery_fee: string | number | null;
  fast_delivery_fee_bulk: string | number | null;
  fast_delivery_bulk_min_qty: number | null;
  warranty_fee: string | number | null;
  free_standard_delivery_min_qty: number | null;
};

/**
 * Calcula o orçamento. Deve correr com um cliente elevado (withAdminContext) para
 * poder ler produtos/garagens/empresa independentemente das políticas RLS.
 */
export async function buildQuote(client: PoolClient, input: QuoteInput): Promise<Quote> {
  const items = input.items;
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const garageIds = Array.from(new Set(items.map((i) => i.garageId).filter((g): g is string => Boolean(g))));

  const [productsRes, taxesRes, garagesRes, settingsRes, companyRes] = await Promise.all([
    client.query<ProductRow>(
      `select id, name, base_price, category, stock_quantity, is_active, external_supplier
         from public.products where id = any($1::uuid[])`,
      [productIds]
    ),
    client.query<TaxRow>(
      `select name, rate, is_percentage, applies_to, is_active from public.taxes
        where is_active = true order by sort_order asc`
    ),
    garageIds.length
      ? client.query<GarageRow>(
          `select id, name, installation_price, is_approved from public.garages where id = any($1::uuid[])`,
          [garageIds]
        )
      : Promise.resolve({ rows: [] as GarageRow[] }),
    client.query<SettingsRow>(
      `select delivery_base_fee, fast_delivery_fee, fast_delivery_fee_bulk, fast_delivery_bulk_min_qty,
              warranty_fee, free_standard_delivery_min_qty
         from public.global_settings limit 1`
    ),
    UUID_RE.test(input.userId)
      ? client.query<{ discount_tier: string | number | null }>(
          `select c.discount_tier
             from public.companies c
             join public.profiles p on p.id = c.profile_id
            where c.profile_id = $1 and p.role = 'company'
            limit 1`,
          [input.userId]
        )
      : Promise.resolve({ rows: [] as Array<{ discount_tier: string | number | null }> }),
  ]);

  const products = new Map(productsRes.rows.map((p) => [p.id, p]));
  const garages = new Map(garagesRes.rows.map((g) => [g.id, g]));
  const taxes = taxesRes.rows.map((t) => ({
    rate: toNum(t.rate),
    is_percentage: Boolean(t.is_percentage),
    applies_to: t.applies_to || 'all',
    is_active: true,
  }));

  const s = settingsRes.rows[0] || ({} as SettingsRow);
  const settings = {
    deliveryBaseFee: toNum(s.delivery_base_fee, 10),
    fastDeliveryFee: toNum(s.fast_delivery_fee, 19.9),
    fastDeliveryFeeBulk: toNum(s.fast_delivery_fee_bulk, 29.9),
    fastDeliveryBulkMinQty: Math.max(1, Math.floor(toNum(s.fast_delivery_bulk_min_qty, 4))),
    freeStandardDeliveryMinQty: Math.max(1, Math.floor(toNum(s.free_standard_delivery_min_qty, 2))),
    warrantyFee: toNum(s.warranty_fee, 5.5),
  };

  const lines: QuoteLine[] = [];
  const stockProblems: Array<{ productId: string; name: string; requested: number; available: number }> = [];
  let subtotal = 0;
  let taxAmount = 0;
  let installationFee = 0;
  let totalTires = 0;

  for (const item of items) {
    const p = products.get(item.productId);
    if (!p || p.is_active === false) {
      throw new QuoteError('PRODUCT_UNAVAILABLE', 'Un article de votre panier n’est plus disponible.', 409, {
        productId: item.productId,
      });
    }
    const base = toNum(p.base_price);
    if (base <= 0) {
      throw new QuoteError('PRODUCT_NO_PRICE', `Prix indisponible pour « ${p.name} ».`, 409, { productId: p.id });
    }
    if (p.stock_quantity != null && p.stock_quantity < item.quantity) {
      stockProblems.push({ productId: p.id, name: p.name, requested: item.quantity, available: Math.max(0, p.stock_quantity) });
      continue;
    }

    let garage: GarageRow | null = null;
    if (item.garageId) {
      garage = garages.get(item.garageId) || null;
      if (!garage || garage.is_approved === false) {
        throw new QuoteError('GARAGE_UNAVAILABLE', 'Le garage sélectionné n’est pas disponible.', 409, {
          garageId: item.garageId,
        });
      }
    }

    const unitPrice = calculateFinalPrice(base, p.category || 'Auto', taxes);
    const lineTotal = round2(unitPrice * item.quantity);
    const installationPrice = garage ? round2(toNum(garage.installation_price)) : 0;
    const installationTotal = round2(installationPrice * item.quantity);

    subtotal += lineTotal;
    taxAmount += round2((unitPrice - base) * item.quantity);
    installationFee += installationTotal;
    totalTires += item.quantity;

    lines.push({
      productId: p.id,
      productName: p.name,
      category: p.category,
      quantity: item.quantity,
      unitBasePrice: round2(base),
      unitPrice,
      lineTotal,
      garageId: garage?.id ?? null,
      garageName: garage?.name ?? null,
      installationPrice,
      installationTotal,
      externalSupplier: p.external_supplier,
    });
  }

  if (stockProblems.length) {
    throw new QuoteError(
      'OUT_OF_STOCK',
      stockProblems.length === 1
        ? `Stock insuffisant pour « ${stockProblems[0].name} » (${stockProblems[0].available} disponible${stockProblems[0].available > 1 ? 's' : ''}).`
        : 'Stock insuffisant pour plusieurs articles de votre panier.',
      409,
      { items: stockProblems }
    );
  }

  subtotal = round2(subtotal);
  taxAmount = round2(taxAmount);
  installationFee = round2(installationFee);

  const discountRate = Math.min(100, Math.max(0, toNum(companyRes.rows[0]?.discount_tier)));
  const discountAmount = round2(subtotal * (discountRate / 100));

  let deliveryFee = 0;
  if (input.deliveryType === 'fast') {
    deliveryFee = totalTires >= settings.fastDeliveryBulkMinQty ? settings.fastDeliveryFeeBulk : settings.fastDeliveryFee;
  } else {
    deliveryFee = totalTires >= settings.freeStandardDeliveryMinQty ? 0 : settings.deliveryBaseFee;
  }
  deliveryFee = round2(deliveryFee);

  const warrantyFeePerUnit = input.warranty ? round2(settings.warrantyFee) : 0;
  const warrantyFee = round2(warrantyFeePerUnit * totalTires);

  const total = round2(subtotal - discountAmount + installationFee + deliveryFee + warrantyFee);
  if (total <= 0) {
    throw new QuoteError('INVALID_TOTAL', 'Montant de commande invalide.', 409);
  }

  return {
    currency: CURRENCY,
    lines,
    totalTires,
    subtotal,
    taxAmount,
    discountRate,
    discountAmount,
    installationFee,
    deliveryType: input.deliveryType,
    deliveryFee,
    warrantyIncluded: Boolean(input.warranty),
    warrantyFeePerUnit,
    warrantyFee,
    total,
    totalCents: Math.round(total * 100),
    settings,
  };
}

export type ContactInput = {
  firstName: string;
  lastName: string;
  company?: string;
  country: string;
  address: string;
  apartment?: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  notes?: string;
};

const ALLOWED_COUNTRIES = new Set(['France', 'Belgique', 'Luxembourg', 'Suisse']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida os dados de contacto/entrega. Devolve erros por campo (para UX) ou o objeto limpo. */
export function validateContact(raw: unknown): { ok: true; contact: ContactInput } | { ok: false; fieldErrors: Record<string, string> } {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (k: string, max = 200) => String(src[k] ?? '').trim().slice(0, max);
  const contact: ContactInput = {
    firstName: str('firstName', 80),
    lastName: str('lastName', 80),
    company: str('company', 120),
    country: str('country', 40) || 'France',
    address: str('address', 200),
    apartment: str('apartment', 120),
    zip: str('zip', 16),
    city: str('city', 80),
    phone: str('phone', 30),
    email: str('email', 254).toLowerCase(),
    notes: str('notes', 1000),
  };

  const fieldErrors: Record<string, string> = {};
  if (!contact.firstName) fieldErrors.firstName = 'Prénom requis';
  if (!contact.lastName) fieldErrors.lastName = 'Nom requis';
  if (!contact.address) fieldErrors.address = 'Adresse requise';
  if (!contact.city) fieldErrors.city = 'Ville requise';
  if (!/^[0-9A-Za-z -]{3,16}$/.test(contact.zip)) fieldErrors.zip = 'Code postal invalide';
  if (!/^[0-9+().\s-]{6,30}$/.test(contact.phone)) fieldErrors.phone = 'Téléphone invalide';
  if (!EMAIL_RE.test(contact.email)) fieldErrors.email = 'E-mail invalide';
  if (!ALLOWED_COUNTRIES.has(contact.country)) fieldErrors.country = 'Pays non desservi';

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, contact };
}
