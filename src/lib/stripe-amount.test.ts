import { describe, expect, it } from 'vitest';
import { amountsMatch, currenciesMatch, toStripeAmountCents } from './stripe-amount';

describe('toStripeAmountCents', () => {
  it('converts euros to cents without float drift', () => {
    expect(toStripeAmountCents(19.99)).toBe(1999);
    expect(toStripeAmountCents('10.10')).toBe(1010);
    expect(toStripeAmountCents(0)).toBe(0);
    expect(toStripeAmountCents('abc')).toBe(0);
  });
});

describe('webhook amount/currency checks', () => {
  it('rejects a client-tampered total', () => {
    expect(amountsMatch(1999, 1)).toBe(false);
    expect(amountsMatch(1999, 19.99)).toBe(true);
    expect(amountsMatch(null, 19.99)).toBe(true);
  });

  it('rejects a currency mismatch', () => {
    expect(currenciesMatch('usd', 'eur')).toBe(false);
    expect(currenciesMatch('EUR', 'eur')).toBe(true);
  });
});
