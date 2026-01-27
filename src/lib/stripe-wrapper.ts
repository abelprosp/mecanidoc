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
    // Usar require em runtime (Node.js) - não é analisado pelo bundler durante o build
    // require.resolve verifica se o módulo existe sem carregá-lo
    if (typeof require === 'undefined' || typeof require.resolve !== 'function') {
      throw new Error('MODULE_NOT_FOUND - require not available');
    }
    
    // Verificar se o módulo existe - isso não quebra o build
    // require.resolve é executado apenas em runtime
    try {
      require.resolve('stripe');
    } catch (resolveError: any) {
      // Módulo não encontrado
      throw new Error('MODULE_NOT_FOUND');
    }
    
    // Carregar o módulo apenas em runtime usando require
    // require() não é analisado estaticamente pelo Next.js/Turbopack
    const StripeModule = require('stripe');
    const Stripe = StripeModule.default || StripeModule;
    
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
