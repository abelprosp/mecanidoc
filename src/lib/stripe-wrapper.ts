import { resolveStripeConfig } from '@/lib/stripe-credentials';

let stripeInstance: any = null;
let stripeInstanceKey: string | null = null;

export function resetStripeClient() {
  stripeInstance = null;
  stripeInstanceKey = null;
}

export const getStripe = async (): Promise<any> => {
  const config = await resolveStripeConfig();
  const secret = config.secretKey;
  if (!secret) return null;

  if (stripeInstance && stripeInstanceKey === secret) {
    return stripeInstance;
  }

  try {
    const StripeModule = await import('stripe');
    const Stripe = StripeModule.default;
    stripeInstance = new Stripe(secret, {
      typescript: true,
    });
    stripeInstanceKey = secret;
    return stripeInstance;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/Cannot find module|Failed to resolve|MODULE_NOT_FOUND/i.test(msg)) {
      console.warn('Stripe: pacote não encontrado. Execute: npm install stripe');
      return null;
    }
    throw error;
  }
};

export const isStripeConfigured = () => {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
};

export async function isStripeReady() {
  const stripe = await getStripe();
  return Boolean(stripe);
}

export const isStripePublishableConfigured = () => {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
};
