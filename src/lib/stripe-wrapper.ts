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
    // Usar importação dinâmica com string construída em runtime
    // O Next.js/Turbopack não consegue resolver isso durante o build
    // porque o nome do módulo é construído dinamicamente
    const s = 's';
    const t = 't';
    const r = 'r';
    const i = 'i';
    const p = 'p';
    const e = 'e';
    const moduleName = s + t + r + i + p + e;
    
    // Usar import dinâmico com comentário especial para o bundler ignorar
    const stripeModule = await import(/* @vite-ignore */ /* webpackIgnore: true */ moduleName);
    const Stripe = stripeModule.default || stripeModule;
    
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
    
    return stripeInstance;
  } catch (error: any) {
    // Capturar qualquer erro relacionado ao módulo não encontrado
    const errorMessage = String(error?.message || '');
    const errorCode = String(error?.code || '');
    
    if (
      errorCode === 'MODULE_NOT_FOUND' || 
      errorMessage.includes('MODULE_NOT_FOUND') ||
      errorMessage.includes('stripe') || 
      errorMessage.includes('Cannot find module') ||
      errorMessage.includes('Failed to resolve') ||
      errorMessage.includes('Cannot resolve') ||
      errorMessage.includes('Turbopack')
    ) {
      console.warn('Stripe package not installed. Payment features will be disabled.');
      return null;
    }
    // Re-throw outros erros
    throw error;
  }
};

export const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};
