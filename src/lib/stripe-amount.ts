export const STRIPE_CURRENCY = 'eur';
/** Montant minimum Stripe pour EUR (50 centimes). */
export const STRIPE_MIN_AMOUNT_CENTS = 50;

export function toStripeAmountCents(amount: number | string | null | undefined): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

export function amountsMatch(stripeCents: number | null | undefined, orderTotal: number | string | null | undefined): boolean {
  if (typeof stripeCents !== 'number' || stripeCents <= 0) return true;
  return stripeCents === toStripeAmountCents(orderTotal);
}

export function currenciesMatch(stripeCurrency: string | null | undefined, orderCurrency: string | null | undefined): boolean {
  if (!stripeCurrency) return true;
  return stripeCurrency.toLowerCase() === (orderCurrency || STRIPE_CURRENCY).toLowerCase();
}
