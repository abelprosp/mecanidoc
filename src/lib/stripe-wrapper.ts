// Wrapper para Stripe que não quebra o build se não estiver instalado
// Usa importação completamente dinâmica que não é resolvida durante o build

let stripeInstance: any = null;

export const getStripe = async (): Promise<any> => {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  try {
    // import() funciona melhor no servidor Next.js que require()
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
  return !!process.env.STRIPE_SECRET_KEY;
};
