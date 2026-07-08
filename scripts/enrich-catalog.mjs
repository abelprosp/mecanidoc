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
 *
 * Env: DATABASE_URL, EPREL_API_KEY, GTINHUB_API_KEY (opcional)
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';
import { fetchEprelLabelPng } from './lib/eprel-client.mjs';
import { flushGtinCache } from './lib/gtin-cache.mjs';
import {
  fetchFullEnrichmentByGtin,
  getDbUrl,
  hasRealImage,
  isGenericProductName,
  needsCatalogEnrichment,
  normalizeGtin,
  parseScriptArgs,
  parseTireSpecsFromText,
  shouldUpdateCategory,
} from './lib/product-enrich.mjs';

loadEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const { Client } = pg;
const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

const REASON_MSG = {
  ean_invalido: 'EAN inválido',
  gtinhub_desativado: 'GTINHub desativado',
  gtinhub_rate_limit: 'GTINHub rate limit',
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
  const clauses = ['ean IS NOT NULL', "length(trim(ean)) >= 8", 'is_active = true'];
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

  const updateName =
    merged.name && (isGenericProductName(product.name) || product.name !== merged.name);
  const updateBrand = merged.brand && (!product.brand || isGenericProductName(product.name));
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

  if (!process.env.EPREL_API_KEY?.trim()) {
    console.warn('Aviso: EPREL_API_KEY não definida — medidas/labels EPREL ficarão limitadas.\n');
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
      SELECT id, ean, name, brand, description, category, images, specs, labels, external_metadata
      FROM products
      WHERE ${where}
      ORDER BY created_at`;
    if (opts.limit > 0) query += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(query, params);
    const targets = rows.filter((r) => needsCatalogEnrichment(r, { force: opts.force }));
    const reasons = {};

    console.log(`Produtos com EAN: ${rows.length} | a enriquecer: ${targets.length}`);
    console.log('Algoritmo: detectar nome genérico → EPREL + GTINHub + UPC (uma passagem)');
    console.log(`Intervalo: ${opts.delayMs}ms | imagens EPREL: ${opts.images ? 'sim' : 'não'}\n`);
    if (opts.dryRun) console.log('Modo dry-run — nada será gravado.\n');

    let ok = 0;
    let skip = 0;
    let fail = 0;
    let noImage = 0;

    for (const product of targets) {
      if (stopping) break;

      const ean = normalizeGtin(product.ean);
      const { merged, reason, sources, fromCache } = await fetchFullEnrichmentByGtin(ean, {
        skipGtinHub: opts.skipGtinHub,
        useCache: !opts.noCache,
      });

      if (!merged?.name) {
        fail++;
        const key = reason || 'desconhecido';
        reasons[key] = (reasons[key] || 0) + 1;
        if (fail <= 12) {
          console.log(`— ${ean}: ${REASON_MSG[key] || key}`);
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
        ]
      );

      ok++;
      const via = `${merged.sources.join('+')}${fromCache ? ' (cache)' : ''}`;
      console.log(`✓ ${ean} via ${via}`);
      console.log(`  ${product.name?.slice(0, 70)}`);
      console.log(`  → ${patch.name?.slice(0, 90)}`);
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
      console.log('\nDica: produtos só no GTINHub → npm run enrich:catalog:vps -- --only-gtinhub --delay=3000 --limit=100');
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
