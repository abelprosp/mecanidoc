#!/usr/bin/env node
/**
 * Apaga TODOS os produtos do catálogo para voltar a puxar da Andrés.
 *
 * Também apaga order_items (FK para products). As encomendas (orders) ficam,
 * sem linhas. Não toca em users, profiles, brands nem global_settings.
 *
 * Uso (VPS, na raiz):
 *   CONFIRM=DELETE_ALL_PRODUCTS npm run purge:products
 *
 * Sem CONFIRM o script só mostra as contagens e sai.
 */
import { spawnSync } from 'child_process';
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import { resolveSuperuserDatabaseUrl } from './lib/resolve-database-url.mjs';

loadEnvFiles();

const { Client } = pg;
const CONFIRM = (process.env.CONFIRM || '').trim();
const MUST = 'DELETE_ALL_PRODUCTS';

const SQL_COUNT = `
SELECT
  (SELECT count(*) FROM public.products) AS products,
  (SELECT count(*) FROM public.order_items) AS order_items;
`;

const SQL_PURGE = `
BEGIN;
DELETE FROM public.order_items;
DELETE FROM public.products;
COMMIT;
`;

function dockerPsql(sql) {
  const user = process.env.POSTGRES_USER || 'mecanidoc';
  const db = process.env.POSTGRES_DB || 'mecanidoc';
  const r = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', db, '-A', '-t', '-F', '|'],
    { input: sql, encoding: 'utf8' }
  );
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'docker compose exec postgres falhou').trim());
  }
  return (r.stdout || '').trim();
}

function parseCounts(text) {
  const line = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  const [products, orderItems] = line.split('|').map((n) => Number(n) || 0);
  return { products, orderItems };
}

async function main() {
  const resolved = resolveSuperuserDatabaseUrl();
  let via = 'tcp';
  let counts;

  const client = new Client({ connectionString: resolved.url });
  try {
    await client.connect();
    const { rows } = await client.query(SQL_COUNT);
    counts = {
      products: Number(rows[0]?.products || 0),
      orderItems: Number(rows[0]?.order_items || 0),
    };
    if (CONFIRM === MUST) {
      await client.query(SQL_PURGE);
    }
    await client.end();
  } catch (err) {
    const msg = err?.message || String(err);
    if (!/password authentication failed|ECONNREFUSED|28P01/i.test(msg)) {
      throw err;
    }
    console.warn(`TCP falhou (${msg}). A usar docker compose exec postgres.`);
    via = 'docker';
    counts = parseCounts(dockerPsql(SQL_COUNT));
    if (CONFIRM === MUST) {
      dockerPsql(SQL_PURGE);
    }
  }

  console.log(`Catálogo atual (${via}): ${counts.products} produtos, ${counts.orderItems} linhas de encomenda.`);

  if (CONFIRM !== MUST) {
    console.log('');
    console.log('Nada foi apagado. Para confirmar:');
    console.log('  CONFIRM=DELETE_ALL_PRODUCTS npm run purge:products');
    process.exit(2);
  }

  const after = via === 'docker'
    ? parseCounts(dockerPsql(SQL_COUNT))
    : counts;
  if (via !== 'docker') {
    const c2 = new Client({ connectionString: resolved.url });
    await c2.connect();
    const { rows } = await c2.query(SQL_COUNT);
    after.products = Number(rows[0]?.products || 0);
    after.orderItems = Number(rows[0]?.order_items || 0);
    await c2.end();
  }

  console.log(`Depois: ${after.products} produtos, ${after.orderItems} linhas de encomenda.`);
  console.log('Catálogo vazio. No admin: Neumáticos Andrés → Puxar pneus da API (ex. 100000–102000).');
}

main().catch((err) => {
  console.error('Falha ao limpar produtos:', err.message || err);
  process.exit(1);
});
