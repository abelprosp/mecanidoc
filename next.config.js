/** @type {import('next').NextConfig} */
const path = require('path');

// Raiz do projeto = pasta onde está este ficheiro (mecanidoc). Evita resolver na pasta pai (package.json em C:\Users\...\Artur).
const projectRoot = __dirname;

const nextConfig = {
  turbopack: {},
  outputFileTracingRoot: projectRoot,
  // Garante que as variáveis de ambiente são lidas e expostas ao client (NEXT_PUBLIC_*)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  webpack: (config) => {
    config.context = projectRoot;
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      path.join(projectRoot, 'node_modules'),
      ...(Array.isArray(config.resolve.modules) ? config.resolve.modules : ['node_modules']),
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      tailwindcss: path.join(projectRoot, 'node_modules', 'tailwindcss'),
      '@tailwindcss/postcss': path.join(projectRoot, 'node_modules', '@tailwindcss/postcss'),
    };
    return config;
  },
};

module.exports = nextConfig;
