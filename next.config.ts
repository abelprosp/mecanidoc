import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack é o padrão no Next.js 16
  // O Stripe é carregado dinamicamente em runtime, então não precisa de configuração especial
  turbopack: {},
};

export default nextConfig;
