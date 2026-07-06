#!/usr/bin/env node
/**
 * Corrige nomes genéricos (ex. "Continental Pneu · Ref. 16425") para o nome
 * comercial original via GTINHub e UPCitemdb.
 *
 * Processa todos os pneus já importados (todas as categorias).
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run fix:product-names
 *   npm run fix:product-names -- --supplier=neumaticos_andres
 *   npm run fix:product-names -- --force
 *   npm run fix:product-names -- --delay=2500
 *   npm run fix:product-names -- --only-gtinhub --delay=3000
 *   npm run fix:product-names:vps -- --supplier=neumaticos_andres
 *
 * Env: DATABASE_URL, GTINHUB_API_KEY (opcional)
 * Nota: este script ignora SKIP_GTINHUB — precisa do GTINHub para nomes reais.
 */
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import {
  fetchOriginalNameByGtin,
  getDbUrl,
  isGenericProductName,
  normalizeGtin,
  parseScriptArgs,
  parseTireSpecsFromText,
} from './lib/product-enrich.mjs';
import { flushGtinCache } from './lib/gtin-cache.mjs';

loadEnvFiles();

const { Client } = pg;

const REASON_MSG = {
  gtinhub_desativado: 'GTINHub desativado (remova SKIP_GTINHUB=1 do .env)',
  gtinhub_rate_limit: 'GTINHub rate limit — use --delay=2000 ou --skip-gtinhub (só EPREL)',
  gtinhub_rate_limit_eprel_vazio: 'GTINHub bloqueou e EPREL não tem este EAN — tente mais tarde com --delay=3000',
  gtinhub_produto_errado: 'GTINHub devolveu produto que não é pneu (EAN errado no fornecedor)',
  upc_produto_errado: 'UPC devolveu produto que não é pneu',
  nome_nao_parece_pneu: 'encontrado mas nome sem medidas de pneu',
  eprel_nao_encontrado: 'não está na EPREL',
  eprel_sem_nome_util: 'EPREL sem nome útil',
  nao_encontrado: 'não encontrado em GTINHub/UPC',
};

function buildWhere(opts) {
  const clauses = ['ean IS NOT NULL', "length(trim(ean)) >= 8"];
  const params = [];
  if (opts.supplier) {
    params.push(opts.supplier);
    clauses.push(`external_supplier = $${params.length}`);
  }
  if (opts.category) {
    params.push(opts.category);
    clauses.push(`category = $${params.length}`);
  }
  return { where: clauses.join(' AND '), params };
}

async function main() {
  const opts = parseScriptArgs(process.argv.slice(2));
  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();

  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
    console.log('\n\nInterrompido — nomes já gravados permanecem na BD.');
  });

  try {
    const { where, params } = buildWhere(opts);
    let query = `
      SELECT id, ean, name, brand, description, category, specs, images, external_metadata, external_product_id
      FROM products
      WHERE ${where}
      ORDER BY created_at`;
    if (opts.limit > 0) query += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(query, params);
    const targets = opts.force ? rows : rows.filter((r) => isGenericProductName(r.name));
    const reasons = {};

    const orderLabel = opts.onlyGtinHub
      ? 'cache → GTINHub → UPC'
      : opts.skipGtinHub
        ? 'cache → EPREL → UPC'
        : opts.eprelFirst
          ? 'cache → EPREL → GTINHub → UPC'
          : 'cache → GTINHub → EPREL → UPC';

    console.log(`Produtos com EAN: ${rows.length} | a corrigir: ${targets.length}`);
    console.log(`Fontes: ${orderLabel} | intervalo ${opts.delayMs}ms\n`);
    if (opts.onlyGtinHub) console.log('Modo --only-gtinhub: 2ª passagem lenta (Hankook, moto, etc.)\n');
    if (opts.skipGtinHub) console.log('Modo --skip-gtinhub: só EPREL + UPC\n');
    if (opts.dryRun) console.log('Modo dry-run — nada será gravado.\n');

    let ok = 0;
    let skip = 0;
    let notFound = 0;

    for (const product of targets) {
      if (stopping) break;

      const ean = normalizeGtin(product.ean);
      const { detail, reason, fromCache } = await fetchOriginalNameByGtin(ean, {
        useEprel: !opts.onlyGtinHub,
        eprelFirst: opts.eprelFirst && !opts.onlyGtinHub,
        skipGtinHub: opts.skipGtinHub && !opts.onlyGtinHub,
        useCache: !opts.noCache,
      });

      if (!detail?.name) {
        notFound++;
        const key = reason || 'desconhecido';
        reasons[key] = (reasons[key] || 0) + 1;
        if (notFound <= 15) {
          const msg = REASON_MSG[reason] || reason || 'desconhecido';
          console.log(`— ${ean}: ${msg}`);
        }
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      if (!opts.force && !isGenericProductName(product.name) && product.name === detail.name) {
        skip++;
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      const specs = {
        ...(typeof product.specs === 'object' && product.specs ? product.specs : {}),
        ...(detail.specs || {}),
      };
      if (!specs.width) Object.assign(specs, parseTireSpecsFromText(detail.name));

      const meta = {
        ...(typeof product.external_metadata === 'object' && product.external_metadata
          ? product.external_metadata
          : {}),
        name_fix: {
          gtin: ean,
          source: detail.source,
          previousName: product.name,
          fixedAt: new Date().toISOString(),
        },
      };

      if (opts.dryRun) {
        ok++;
        console.log(`[dry-run] ${ean}`);
        console.log(`  antes: ${product.name}`);
        console.log(`  depois: ${detail.name} (${detail.source})\n`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      await client.query(
        `UPDATE products SET
           name = $2,
           brand = COALESCE($3, brand),
           description = COALESCE($4, description),
           specs = $5::jsonb,
           images = CASE WHEN $6::text[] IS NOT NULL THEN $6 ELSE images END,
           external_metadata = $7::jsonb
         WHERE id = $1`,
        [
          product.id,
          detail.name,
          detail.brand,
          detail.description,
          JSON.stringify(specs),
          detail.imageUrl && !product.images?.length ? [detail.imageUrl] : null,
          JSON.stringify(meta),
        ]
      );

      ok++;
      const via = fromCache ? `${detail.source} (cache)` : detail.source;
      console.log(`✓ ${ean} via ${via}`);
      console.log(`  ${product.name?.slice(0, 70)}`);
      console.log(`  → ${detail.name?.slice(0, 90)}\n`);

      await new Promise((r) => setTimeout(r, opts.delayMs));
    }

    console.log('--- Resumo ---');
    console.log(`Nomes corrigidos: ${ok}`);
    console.log(`Já com nome real (ignorados): ${rows.length - targets.length + skip}`);
    console.log(`Não encontrados: ${notFound}`);
    if (Object.keys(reasons).length) {
      console.log('\n--- Motivos (não encontrados) ---');
      for (const [key, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count}x ${REASON_MSG[key] || key}`);
      }
    }
    if (notFound > 0) {
      console.log('\nPróximos passos:');
      console.log('  1. EPREL (auto, medidas + nome): npm run enrich:eprel:vps -- --supplier=neumaticos_andres');
      console.log('  2. GTINHub lento (Hankook/moto): npm run fix:product-names:vps -- --only-gtinhub --delay=3000');
      console.log('  3. Repetir passo 2 em lotes: --limit=100 (várias vezes)');
    }
    flushGtinCache();
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
