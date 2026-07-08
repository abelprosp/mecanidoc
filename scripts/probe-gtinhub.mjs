#!/usr/bin/env node
/**
 * Testa se GTINHUB_API_KEY está carregada e funciona.
 *
 *   npm run probe:gtinhub
 *   npm run probe:gtinhub:vps
 */
import { loadEnvFiles } from './lib/load-env.mjs';
import { printEnrichEnvStatus, gtinHubKeyStatus } from './lib/env-status.mjs';

loadEnvFiles();
printEnrichEnvStatus();

const key = process.env.GTINHUB_API_KEY?.trim();
if (!key) {
  console.error('❌ GTINHUB_API_KEY não encontrada.');
  console.error('');
  console.error('Na VPS, edite o ficheiro na pasta do projeto:');
  console.error('  nano ~/mecanidoc/.env');
  console.error('');
  console.error('Adicione (sem espaços, sem aspas):');
  console.error('  GTINHUB_API_KEY=sua_chave_aqui');
  console.error('');
  console.error('Ficheiros lidos: .env e .env.local (na raiz do mecanidoc)');
  process.exit(1);
}

const base = (process.env.GTINHUB_BASE_URL || 'https://gtinhub.com/api/v1').replace(/\/$/, '');
const testEan = process.argv.find((a) => a.startsWith('--ean='))?.slice(6) || '3286342387215';
const url = `${base}/product/${encodeURIComponent(testEan)}`;

console.log(`Teste GTINHub: GET ${url}`);
console.log(`Header: X-API-Key (${key.length} chars)\n`);

const res = await fetch(url, {
  headers: { Accept: 'application/json', 'X-API-Key': key },
});

const body = await res.json().catch(() => null);
console.log(`HTTP ${res.status}`);

if (res.ok && body?.found && body?.product?.name) {
  console.log('✅ API key OK');
  console.log(`   Nome: ${body.product.name}`);
  console.log(`   Marca: ${body.product.brand || '—'}`);
  process.exit(0);
}

if (res.status === 429 || body?.error?.error === 'rate_limit_exceeded') {
  const msg = body?.error?.message || 'rate limit';
  const used = body?.error?.used;
  const limit = body?.error?.limit;
  console.error('❌ GTINHub bloqueou (429)');
  console.error(`   ${msg}`);
  if (used != null && limit != null) console.error(`   Usado: ${used}/${limit}`);
  if (msg.toLowerCase().includes('free request limit')) {
    console.error('');
    console.error('   A chave NÃO está a ser usada — ainda responde como plano grátis.');
    console.error('   Confirme GTINHUB_API_KEY no .env da VPS e corra: npm run probe:gtinhub:vps');
  }
  process.exit(1);
}

if (res.status === 401 || res.status === 403) {
  console.error('❌ API key inválida ou expirada');
  console.error('   Gere nova chave em https://gtinhub.com/api');
  process.exit(1);
}

console.error('❌ Resposta inesperada:', JSON.stringify(body)?.slice(0, 500));
process.exit(1);
