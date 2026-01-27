import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Tornar stripe opcional - não quebra o build se não estiver instalado
    if (isServer) {
      config.externals = config.externals || [];
      // Adicionar stripe como externo - será resolvido em runtime
      if (Array.isArray(config.externals)) {
        config.externals.push('stripe');
      } else if (typeof config.externals === 'object') {
        config.externals.stripe = 'commonjs stripe';
      }
    }
    return config;
  },
  // Configuração para Turbopack
  experimental: {
    // Turbopack pode não respeitar externals, mas tentamos
  },
};

export default nextConfig;
