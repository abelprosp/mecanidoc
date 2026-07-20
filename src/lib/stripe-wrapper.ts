// Wrapper Stripe — import dynamique pour ne pas casser le build si le package manque.

let stripeInstance: any = null;

export const getStripe = async (): Promise<any> => {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return null;
  }

  try {
    const StripeModule = await import('stripe');
    const Stripe = StripeModule.default;
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
    return stripeInstance;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/Cannot find module|stripe|Failed to resolve|MODULE_NOT_FOUND/i.test(msg)) {
      console.warn('Stripe: pacote não encontrado. Execute: npm install stripe');
      return null;
    }
    throw error;
  }
};

export const isStripeConfigured = () => {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
};

export const isStripePublishableConfigured = () => {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
};
