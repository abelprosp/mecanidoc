#!/usr/bin/env node
/**
 * Baixa etiquetas EPREL (PNG) como imagem de produto para todos os pneus com EAN na BD.
 *
 * A EPREL não tem foto do pneu — usa a etiqueta energética UE (PNG), que inclui
 * marca, medidas e classes A–E.
 *
 * Uso:
 *   npm run fetch:eprel-images
 *   npm run fetch:eprel-images -- --supplier=neumaticos_andres
 *   npm run fetch:eprel-images -- --force
 *   npm run fetch:eprel-images -- --dry-run
 */
import pg from 'pg';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchEprelProductByGtin,
  fetchEprelLabelPng,
  normalizeGtin,
} from './lib/eprel-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvFiles() {
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnvFiles();

const { Client } = pg;
const dbUrl =
  process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5433/mecanidoc';
const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

function parseArgs(argv) {
  const opts = { dryRun: false, force: false, supplier: null, limit: 0, delayMs: 250 };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--force') opts.force = true;
    if (arg.startsWith('--supplier=')) opts.supplier = arg.slice(11);
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--delay=')) opts.delayMs = Number(arg.slice(8));
  }
  return opts;
}

function hasRealImage(images) {
  if (!Array.isArray(images) || !images.length) return false;
  const url = String(images[0] || '');
  if (!url || url.includes('placehold.co') || url.includes('text=Pneu')) return false;
  return true;
}

function saveLabelImage(productId, buffer) {
  const dir = path.join(uploadRoot, 'product-images', productId);
  mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-eprel.png`;
  writeFileSync(path.join(dir, fileName), buffer);
  return `/imagem/product-images/${productId}/${fileName}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.EPREL_API_KEY?.trim()) {
    throw new Error('Defina EPREL_API_KEY no .env.local');
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    let query = `
      SELECT id, ean, name, brand, images, labels, specs, external_metadata
      FROM products
      WHERE ean IS NOT NULL AND length(trim(ean)) >= 8`;
    const params = [];
    if (opts.supplier) {
      params.push(opts.supplier);
      query += ` AND external_supplier = $1`;
    }
    query += ` ORDER BY created_at`;
    if (opts.limit > 0) query += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(query, params);
    const targets = opts.force ? rows : rows.filter((r) => !hasRealImage(r.images));

    console.log(`Produtos com EAN: ${rows.length} | a processar: ${targets.length}`);
    console.log('Fonte: EPREL — etiqueta energética PNG por EAN\n');

    let ok = 0;
    let skip = 0;
    let notInEprel = 0;
    let noLabel = 0;

    for (const product of targets) {
      const ean = normalizeGtin(product.ean);
      const eprel = await fetchEprelProductByGtin(ean);

      if (!eprel?.registrationNumber) {
        notInEprel++;
        if (notInEprel <= 8) console.log(`— ${ean}: não encontrado na EPREL`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      const label = await fetchEprelLabelPng(eprel.registrationNumber, eprel.productGroup || 'tyres');
      if (!label) {
        noLabel++;
        if (noLabel <= 5) console.log(`— ${ean}: EPREL sem etiqueta PNG (reg ${eprel.registrationNumber})`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      if (opts.dryRun) {
        ok++;
        console.log(`[dry-run] ${ean} → ${eprel.name} (${label.buffer.length} bytes PNG)`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      const imagePath = saveLabelImage(product.id, label.buffer);
      const meta = {
        ...(typeof product.external_metadata === 'object' && product.external_metadata
          ? product.external_metadata
          : {}),
        eprel_image: {
          registrationNumber: eprel.registrationNumber,
          fetchedAt: new Date().toISOString(),
        },
      };

      await client.query(
        `UPDATE products SET
           images = $2::text[],
           labels = COALESCE($3::jsonb, labels),
           specs = COALESCE($4::jsonb, specs),
           external_metadata = $5::jsonb
         WHERE id = $1`,
        [
          product.id,
          [imagePath],
          eprel.labels ? JSON.stringify({ ...(product.labels || {}), ...eprel.labels }) : null,
          eprel.specs ? JSON.stringify({ ...(product.specs || {}), ...eprel.specs }) : null,
          JSON.stringify(meta),
        ]
      );

      ok++;
      if (ok <= 15 || ok % 20 === 0) {
        console.log(`✓ ${eprel.brand || '?'} ${ean} → ${imagePath}`);
      }

      await new Promise((r) => setTimeout(r, opts.delayMs));
    }

    console.log('\n--- Resumo ---');
    console.log(`Imagens EPREL gravadas: ${ok}`);
    console.log(`Já com imagem (ignorados): ${rows.length - targets.length}`);
    console.log(`Não na EPREL: ${notInEprel}`);
    console.log(`Sem etiqueta PNG: ${noLabel}`);
    console.log(`Outros ignorados: ${skip}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
