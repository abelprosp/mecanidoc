#!/usr/bin/env node
/**
 * Enriquecimento completo do catálogo em uma passagem:
 * 1. Detecta produtos com nome genérico (ex. "Continental Pneu · Ref. 16425")
 * 2. Busca nome real: EPREL → GTINHub → UPC
 * 3. Enriquece medidas, etiqueta UE (A–E), marca, categoria e imagem EPREL
 *
 * Grava cada produto na BD assim que processado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run enrich:catalog
 *   npm run enrich:catalog -- --supplier=neumaticos_andres
 *   npm run enrich:catalog -- --limit=100 --delay=1500
 *   npm run enrich:catalog -- --dry-run
 *   npm run enrich:catalog:vps -- --supplier=neumaticos_andres
 *   npm run enrich:generic:vps -- --limit=30 --delay=8000
 *   npm run enrich:catalog:vps -- --refs=13071,13063,13062
 *
 * Env: DATABASE_URL, EPREL_API_KEY, GTINHUB_API_KEY (opcional)
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';
import { printEnrichEnvStatus } from './lib/env-status.mjs';
import { fetchEprelLabelPng } from './lib/eprel-client.mjs';
import { flushGtinCache, sleep } from './lib/gtin-cache.mjs';
import {
  fetchFullEnrichmentByGtin,
  genericNameSqlClause,
  getDbUrl,
  hasRealImage,
  isGenericProductName,
  isGtinHubDailyQuotaExhausted,
  needsCatalogEnrichment,
  normalizeGtin,
  parseScriptArgs,
  parseTireSpecsFromText,
  shouldUpdateBrand,
  shouldUpdateCategory,
} from './lib/product-enrich.mjs';
import { resolveProductName } from './lib/resolve-product-name.mjs';

loadEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const { Client } = pg;
const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

const REASON_MSG = {
  ean_invalido: 'EAN inválido',
  gtinhub_desativado: 'GTINHub desativado',
  gtinhub_rate_limit: 'GTINHub rate limit temporário (429)',
  gtinhub_quota_diaria: 'GTINHub quota diária esgotada (~10/dia sem chave)',
  upc_rate_limit: 'UPCitemdb rate limit (use --skip-upc e GTINHub)',
  upc_desativado: 'UPC desativado (--skip-upc)',
  gtinhub_rate_limit_eprel_vazio: 'GTINHub bloqueou e EPREL vazio',
  gtinhub_produto_errado: 'EAN errado no fornecedor (não é pneu)',
  upc_produto_errado: 'UPC devolveu produto errado',
  eprel_sem_nome_util: 'EPREL sem nome útil',
  eprel_nao_encontrado: 'não está na EPREL',
  nao_encontrado: 'não encontrado em nenhuma API',
};

function saveLabelImage(productId, buffer) {
  const dir = path.join(uploadRoot, 'product-images', productId);
  mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-eprel.png`;
  writeFileSync(path.join(dir, fileName), buffer);
  return `/imagem/product-images/${productId}/${fileName}`;
}

function buildWhere(opts) {
  const clauses = ['is_active = true'];
  const params = [];

  if (opts.refs?.length) {
    params.push(opts.refs);
    clauses.push(`external_product_id = ANY($${params.length}::text[])`);
    if (opts.supplier) {
      params.push(opts.supplier);
      clauses.push(`external_supplier = $${params.length}`);
    }
    return { where: clauses.join(' AND '), params };
  }

  if (opts.ref) {
    params.push(opts.ref);
    clauses.push(`external_product_id = $${params.length}`);
    return { where: clauses.join(' AND '), params };
  }

  clauses.push('ean IS NOT NULL', "length(trim(ean)) >= 8");
  if (opts.supplier) {
    params.push(opts.supplier);
    clauses.push(`external_supplier = $${params.length}`);
  }
  if (opts.category) {
    params.push(opts.category);
    clauses.push(`category = $${params.length}`);
  }
  if (opts.brand) {
    const brands = opts.brand.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);
    if (brands.length) {
      params.push(brands);
      clauses.push(`lower(trim(brand)) = ANY($${params.length}::text[])`);
    }
  }
  if (opts.genericOnly) {
    clauses.push(genericNameSqlClause());
  }
  return { where: clauses.join(' AND '), params };
}

function buildProductPatch(product, merged, imagePath) {
  const specs = {
    ...(typeof product.specs === 'object' && product.specs ? product.specs : {}),
    ...(merged.specs || {}),
  };
  if (!specs.width) Object.assign(specs, parseTireSpecsFromText(merged.name));

  const labels = {
    ...(typeof product.labels === 'object' && product.labels ? product.labels : {}),
    ...(merged.labels || {}),
  };
  if (imagePath) labels.label_url = imagePath;

  const updateName =
    merged.name && (isGenericProductName(product.name) || product.name !== merged.name);
  const updateBrand = shouldUpdateBrand(product.brand, product.name, merged.brand);
  const updateCategory = shouldUpdateCategory(product.category, merged.category);

  let images = null;
  if (imagePath) images = [imagePath];
  else if (merged.imageUrl && !hasRealImage(product.images)) images = [merged.imageUrl];

  const meta = {
    ...(typeof product.external_metadata === 'object' && product.external_metadata
      ? product.external_metadata
      : {}),
    catalog_enrich: {
      gtin: normalizeGtin(product.ean),
      sources: merged.sources || [merged.source],
      previousName: product.name,
      registrationNumber: merged.registrationNumber || null,
      enrichedAt: new Date().toISOString(),
    },
  };
  if (merged.registrationNumber) {
    meta.eprel_enrich = {
      gtin: normalizeGtin(product.ean),
      registrationNumber: merged.registrationNumber,
      tyreClass: merged.tyreClass || null,
      enrichedAt: new Date().toISOString(),
    };
  }

  return {
    updateName,
    updateBrand,
    updateCategory,
    name: merged.name,
    brand: merged.brand,
    category: merged.category,
    description: merged.description,
    specs,
    labels,
    images,
    meta,
  };
}

async function main() {
  const opts = parseScriptArgs(process.argv.slice(2));

  printEnrichEnvStatus();

  if (!process.env.EPREL_API_KEY?.trim()) {
    console.warn('Aviso: EPREL_API_KEY não definida — medidas/labels EPREL ficarão limitadas.\n');
  }
    if (!process.env.GTINHUB_API_KEY?.trim() && !opts.skipGtinHub) {
    console.warn(
      'Aviso: sem GTINHUB_API_KEY — plano grátis ~10 pedidos/dia. Pneus EU dependem do GTINHub.\n' +
        '  → https://gtinhub.com/api  |  adicione GTINHUB_API_KEY no .env\n'
    );
  }
  if (!opts.skipUpc) {
    console.warn(
      'Aviso: UPCitemdb ativo — quota grátis ~100/dia, poucos EANs europeus.\n' +
        '  Recomendado para catálogo NA: omitir --with-upc (só EPREL + GTINHub)\n'
    );
  } else {
    console.log('UPCitemdb: desativado (--skip-upc padrão para pneus europeus)\n');
  }

  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();

  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
    console.log('\n\nInterrompido — produtos já gravados permanecem na BD.');
  });

  try {
    const { where, params } = buildWhere(opts);
    let query = `
      SELECT id, ean, name, brand, description, category, images, specs, labels, external_metadata, external_product_id
      FROM products
      WHERE ${where}
      ORDER BY created_at`;
    if (opts.limit > 0) query += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(query, params);
    const targets = rows.filter((r) =>
      opts.genericOnly || opts.refs?.length || opts.ref
        ? isGenericProductName(r.name) || opts.force
        : needsCatalogEnrichment(r, { force: opts.force })
    );
    const reasons = {};

    console.log(`Produtos na query: ${rows.length} | nomes genéricos a enriquecer: ${targets.length}`);
    if (opts.genericOnly) console.log('Filtro: só nomes genéricos (Pneu NA Ref., Marca Pneu · Ref., etc.)');
    const providers = ['EPREL', 'GTINHub'];
    if (!opts.skipUpc) providers.push('UPC');
    console.log(`Algoritmo: NA getstock → EAN → ${providers.join(' + ')}`);
    console.log(`Intervalo: ${opts.delayMs}ms | imagens EPREL: ${opts.images ? 'sim' : 'não'}`);
    if (!process.env.GTINHUB_API_KEY?.trim() && !opts.skipGtinHub) {
      console.log('GTINHub: plano grátis ~10 pedidos/dia por IP — após esgotar, pare e retome amanhã ou use GTINHUB_API_KEY\n');
    } else {
      console.log('');
    }
    if (opts.dryRun) console.log('Modo dry-run — nada será gravado.\n');

    let ok = 0;
    let skip = 0;
    let fail = 0;
    let noImage = 0;

    let quotaStop = false;

    for (const product of targets) {
      if (stopping) break;
      if (quotaStop || isGtinHubDailyQuotaExhausted()) {
        quotaStop = true;
        fail++;
        reasons.gtinhub_quota_diaria = (reasons.gtinhub_quota_diaria || 0) + 1;
        continue;
      }

      const ean = normalizeGtin(product.ean);
      const naRef = product.external_product_id || product.specs?.na_ref || null;

      let resolved = null;
      let rateLimitRetries = 0;
      const hasGtinHubKey = Boolean(process.env.GTINHUB_API_KEY?.trim());
      const maxRateLimitRetries = hasGtinHubKey ? (opts.onlyGtinHub ? 2 : 1) : 0;

      const retryable = new Set(hasGtinHubKey ? ['gtinhub_rate_limit'] : []);

      while (rateLimitRetries <= maxRateLimitRetries) {
        resolved = await resolveProductName({
          naRef,
          ean,
          skipGtinHub: opts.skipGtinHub,
          skipUpc: opts.skipUpc,
          useCache: !opts.noCache,
        });
        if (resolved.merged?.name) break;
        if (
          resolved.reason === 'gtinhub_quota_diaria' ||
          (!hasGtinHubKey && resolved.reason === 'gtinhub_rate_limit')
        ) {
          quotaStop = true;
          if (resolved.reason === 'gtinhub_rate_limit') {
            resolved.reason = 'gtinhub_quota_diaria';
          }
          break;
        }
        if (!retryable.has(resolved.reason)) break;

        rateLimitRetries++;
        if (rateLimitRetries > maxRateLimitRetries) break;

        const waitMs = Math.min(60000, 20000 * rateLimitRetries);
        console.log(
          `⏳ ${ean}: GTINHub 429 temporário — aguardar ${Math.round(waitMs / 1000)}s (${rateLimitRetries}/${maxRateLimitRetries})...`
        );
        await sleep(waitMs);
      }

      const { merged, reason, sources, fromCache } = {
        merged: resolved.merged,
        reason: resolved.reason,
        sources: resolved.sources,
        fromCache: resolved.fromCache,
      };
      const verifiedEan = resolved.ean || ean;

      if (!merged?.name) {
        fail++;
        const key = reason || 'desconhecido';
        reasons[key] = (reasons[key] || 0) + 1;
        if (fail <= 12) {
          console.log(`— ${ean}: ${REASON_MSG[key] || key}`);
        }
        if (key === 'gtinhub_quota_diaria' && quotaStop) {
          const remaining = targets.length - (ok + skip + fail);
          if (remaining > 0) {
            console.log(
              `\n⛔ GTINHub quota diária esgotada — ${remaining} produto(s) ignorado(s) neste lote.`
            );
            console.log('   Soluções:');
            console.log('   1. Adicionar GTINHUB_API_KEY no .env (https://gtinhub.com/api)');
            console.log('   2. Retomar amanhã: npm run enrich:generic:vps -- --limit=8 --delay=10000');
            console.log('   3. Lotes pequenos: --limit=8 (não --limit=20)\n');
          }
          break;
        }
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      merged.sources = sources?.length ? sources : [merged.source];

      let imagePath = null;
      if (opts.images && merged.registrationNumber && !hasRealImage(product.images)) {
        const label = await fetchEprelLabelPng(merged.registrationNumber, merged.productGroup || 'tyres');
        if (label) imagePath = saveLabelImage(product.id, label.buffer);
        else noImage++;
      }

      const patch = buildProductPatch(product, merged, imagePath);

      if (
        !opts.force &&
        !isGenericProductName(product.name) &&
        product.name === patch.name &&
        product.specs?.width &&
        product.specs?.height &&
        product.specs?.diameter
      ) {
        skip++;
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      if (opts.dryRun) {
        ok++;
        console.log(`[dry-run] ${ean} (${merged.sources.join('+')}${fromCache ? ', cache' : ''})`);
        console.log(`  antes: ${product.name?.slice(0, 80)}`);
        console.log(`  depois: ${patch.name?.slice(0, 90)}`);
        if (patch.specs?.width) {
          console.log(
            `  medidas: ${patch.specs.width}/${patch.specs.height} R${patch.specs.diameter} ${patch.specs.load_index || ''}${patch.specs.speed_index || ''}`
          );
        }
        console.log('');
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      await client.query(
        `UPDATE products SET
           ean = COALESCE($13, ean),
           name = CASE WHEN $2 THEN $3 ELSE name END,
           brand = CASE WHEN $4 THEN $5 ELSE brand END,
           category = CASE WHEN $6 THEN $7 ELSE category END,
           description = COALESCE($8, description),
           specs = $9::jsonb,
           labels = $10::jsonb,
           images = CASE WHEN $11::text[] IS NOT NULL THEN $11 ELSE images END,
           external_metadata = $12::jsonb
         WHERE id = $1`,
        [
          product.id,
          patch.updateName,
          patch.name,
          patch.updateBrand,
          patch.brand,
          patch.updateCategory,
          patch.category || null,
          patch.description || null,
          JSON.stringify(patch.specs),
          JSON.stringify(patch.labels),
          patch.images,
          JSON.stringify(patch.meta),
          verifiedEan !== ean ? verifiedEan : null,
        ]
      );

      ok++;
      const via = `${merged.sources.join('+')}${fromCache ? ' (cache)' : ''}`;
      console.log(`✓ ref ${naRef || '-'} | ${verifiedEan} via ${via}`);
      console.log(`  ${product.name?.slice(0, 70)}`);
      console.log(`  → ${patch.name?.slice(0, 90)}`);
      if (patch.updateBrand && patch.brand) {
        console.log(`  marca: ${product.brand || '(vazia)'} → ${patch.brand}`);
      }
      if (patch.specs?.width) {
        console.log(
          `  ${patch.specs.width}/${patch.specs.height} R${patch.specs.diameter} | fuel=${patch.labels?.fuel || '-'} wet=${patch.labels?.wet || '-'}`
        );
      }
      if (imagePath) console.log(`  imagem: ${imagePath}`);
      console.log('');

      await new Promise((r) => setTimeout(r, opts.delayMs));
    }

    console.log('--- Resumo enriquecimento completo ---');
    console.log(`Enriquecidos: ${ok}`);
    console.log(`Já completos (ignorados): ${rows.length - targets.length + skip}`);
    console.log(`Sem dados: ${fail}`);
    if (opts.images) console.log(`Sem imagem EPREL: ${noImage}`);

    if (Object.keys(reasons).length) {
      console.log('\n--- Motivos (sem dados) ---');
      for (const [key, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count}x ${REASON_MSG[key] || key}`);
      }
    }

    if (fail > 0) {
      console.log('\nDicas quando APIs bloqueiam:');
      console.log('  1. GTINHUB_API_KEY no .env — resolve quota diária (https://gtinhub.com/api)');
      console.log('  2. Sem chave: máx. ~10/dia → npm run enrich:generic:vps -- --limit=8 --delay=10000');
      console.log('  3. Não use --limit=20 sem GTINHUB_API_KEY — quota esgota a meio');
      console.log('  4. Retomar amanhã — cache em .cache/gtin-names.json');
    }

    flushGtinCache();
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  const msg = err.message || String(err);
  console.error(msg);
  if (/EAI_AGAIN|ENOTFOUND|ECONNREFUSED/.test(msg) && /@postgres[:/]/.test(process.env.DATABASE_URL || '')) {
    console.error('\nO hostname "postgres" só funciona dentro da rede Docker.');
    console.error('Na VPS use:');
    console.error('  npm run enrich:catalog:vps -- --supplier=neumaticos_andres --brand=Gitigroup,Giti --delay=2000');
  }
  process.exit(1);
});
