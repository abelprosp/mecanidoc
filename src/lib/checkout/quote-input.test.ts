import { describe, expect, it } from 'vitest';
import {
  MAX_ITEMS,
  MAX_QTY_PER_ITEM,
  QuoteError,
  normalizeDeliveryType,
  normalizeQuoteItems,
} from './quote-input';

const PID = '11111111-1111-4111-8111-111111111111';
const GID = '22222222-2222-4222-8222-222222222222';

describe('normalizeQuoteItems', () => {
  it('rejects an empty cart', () => {
    expect(() => normalizeQuoteItems([])).toThrow(QuoteError);
    expect(() => normalizeQuoteItems(null)).toThrow(/panier est vide/i);
  });

  it('rejects a client-supplied price (only ids and qty)', () => {
    const items = normalizeQuoteItems([{ productId: PID, quantity: 2, unitPrice: 0.01, total: 0.01 }]);
    expect(items).toEqual([{ productId: PID, quantity: 2, garageId: null }]);
    expect(JSON.stringify(items)).not.toMatch(/unitPrice|total/);
  });

  it('merges duplicate product+garage lines and caps quantity', () => {
    const items = normalizeQuoteItems([
      { productId: PID, quantity: 12, garageId: GID },
      { productId: PID, quantity: 12, garageId: GID },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(MAX_QTY_PER_ITEM);
  });

  it('rejects invalid uuid, qty and oversized carts', () => {
    expect(() => normalizeQuoteItems([{ productId: 'not-a-uuid', quantity: 1 }])).toThrow(/Article invalide/);
    expect(() => normalizeQuoteItems([{ productId: PID, quantity: 0 }])).toThrow(/Quantité/);
    expect(() => normalizeQuoteItems([{ productId: PID, quantity: 1, garageId: 'bad' }])).toThrow(/Garage/);
    expect(() =>
      normalizeQuoteItems(Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ productId: PID, quantity: 1, i })))
    ).toThrow(/Maximum/);
  });
});

describe('normalizeDeliveryType', () => {
  it('only accepts fast; everything else is normal', () => {
    expect(normalizeDeliveryType('fast')).toBe('fast');
    expect(normalizeDeliveryType('express')).toBe('normal');
    expect(normalizeDeliveryType(undefined)).toBe('normal');
  });
});
