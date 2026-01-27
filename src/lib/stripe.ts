import Stripe from 'stripe';

// Tornar Stripe opcional para não quebrar o build se as chaves não estiverem configuradas
// O pacote stripe deve estar instalado, mas as chaves podem não estar configuradas
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

export const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};
