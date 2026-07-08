#!/usr/bin/env node
/**
 * Enriquece produtos com dados EPREL: nome, marca, medidas, etiqueta UE (A–E).
 * Opcionalmente grava imagem da etiqueta energética PNG.
 *
 * Processa todos os pneus já importados (todas as categorias).
 * Grava cada produto na BD assim que processado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run enrich:eprel
 *   npm run enrich:eprel -- --supplier=neumaticos_andres
 *   npm run enrich:eprel -- --force
 *   npm run enrich:eprel -- --no-images
 *   npm run enrich:eprel:vps -- --supplier=neumaticos_andres
 *
 * Env: DATABASE_URL, EPREL_API_KEY, EPREL_BASE_URL
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';
import { fetchEprelProductByGtin, fetchEprelLabelPng } from './lib/eprel-client.mjs';
import {
  getDbUrl,
  hasRealImage,
  isGenericProductName,
  normalizeGtin,
  parseScriptArgs,
  parseTireSpecsFromText,
} from './lib/product-enrich.mjs';

loadEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const { Client } = pg;
const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

function saveLabelImage(productId, buffer) {
  const dir = path.join(uploadRoot, 'product-images', productId);
  mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-eprel.png`;
  writeFileSync(path.join(dir, fileName), buffer);
  return `/imagem/product-images/${productId}/${fileName}`;
}

function shouldUpdateCategory(current, eprelCategory) {
  if (!eprelCategory) return false;
  if (!current) return true;
  if (current === eprelCategory) return false;
  if (current === 'Auto' && eprelCategory !== 'Auto') return true;
  if (eprelCategory === 'Camion' || eprelCategory === 'Tracteur') return true;
  return false;
}

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

function alreadyEnriched(product) {
  const meta = product.external_metadata?.eprel_enrich;
  return Boolean(meta?.registrationNumber && meta?.enrichedAt);
}

async function main() {
  const opts = parseScriptArgs(process.argv.slice(2));

  if (!process.env.EPREL_API_KEY?.trim()) {
    throw new Error('Defina EPREL_API_KEY no .env');
  }

  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();

  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
    console.log('\n\nInterrompido — dados EPREL já gravados permanecem na BD.');
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
    const targets = opts.force ? rows : rows.filter((r) => !alreadyEnriched(r));

    console.log(`Produtos com EAN: ${rows.length} | a enriquecer EPREL: ${targets.length}`);
    console.log(`Imagens etiqueta UE: ${opts.images ? 'sim' : 'não'}`);
    if (opts.dryRun) console.log('Modo dry-run — nada será gravado.\n');

    let ok = 0;
    let notInEprel = 0;
    let noImage = 0;

    for (const product of targets) {
      if (stopping) break;

      const ean = normalizeGtin(product.ean);
      const eprel = await fetchEprelProductByGtin(ean);

      if (!eprel?.registrationNumber) {
        notInEprel++;
        if (notInEprel <= 10) console.log(`— ${ean}: não encontrado na EPREL`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      const specs = {
        ...(typeof product.specs === 'object' && product.specs ? product.specs : {}),
        ...(eprel.specs || {}),
      };
      if (!specs.width) Object.assign(specs, parseTireSpecsFromText(eprel.name || product.name));

      const labels = {
        ...(typeof product.labels === 'object' && product.labels ? product.labels : {}),
        ...(eprel.labels || {}),
      };
      if (imagePath) labels.label_url = imagePath;

      let imagePath = null;
      if (opts.images && !hasRealImage(product.images)) {
        const label = await fetchEprelLabelPng(eprel.registrationNumber, eprel.productGroup || 'tyres');
        if (label) imagePath = saveLabelImage(product.id, label.buffer);
        else noImage++;
      }

      const updateName =
        eprel.name && (opts.force || isGenericProductName(product.name) || product.name !== eprel.name);
      const updateBrand = eprel.brand && (opts.force || !product.brand || isGenericProductName(product.name));
      const updateCategory = shouldUpdateCategory(product.category, eprel.category);

      const meta = {
        ...(typeof product.external_metadata === 'object' && product.external_metadata
          ? product.external_metadata
          : {}),
        eprel_enrich: {
          gtin: ean,
          registrationNumber: eprel.registrationNumber,
          tyreClass: eprel.tyreClass || null,
          enrichedAt: new Date().toISOString(),
        },
      };

      if (opts.dryRun) {
        ok++;
        console.log(`[dry-run] ${ean} → ${eprel.name}`);
        console.log(`  labels: fuel=${labels.fuel || '-'} wet=${labels.wet || '-'} noise=${labels.noise || '-'}`);
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
          updateName,
          eprel.name,
          updateBrand,
          eprel.brand,
          updateCategory,
          eprel.category || null,
          eprel.description || null,
          JSON.stringify(specs),
          JSON.stringify(labels),
          imagePath ? [imagePath] : null,
          JSON.stringify(meta),
        ]
      );

      ok++;
      console.log(`✓ ${ean} → ${eprel.name?.slice(0, 80)}`);
      if (imagePath) console.log(`  imagem: ${imagePath}`);

      await new Promise((r) => setTimeout(r, opts.delayMs));
    }

    console.log('\n--- Resumo EPREL ---');
    console.log(`Enriquecidos: ${ok}`);
    console.log(`Já enriquecidos (ignorados): ${rows.length - targets.length}`);
    console.log(`Não na EPREL: ${notInEprel}`);
    if (opts.images) console.log(`Sem etiqueta PNG: ${noImage}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
