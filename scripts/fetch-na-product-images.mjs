#!/usr/bin/env node
/**
 * Busca e grava fotos para produtos Neumáticos Andrés.
 *
 * Nota: a API NA (getstock) só devolve ref, EAN, preço e stock — sem imagem.
 * Este script consulta o fornecedor para validar o artigo e obtém fotos via:
 *   1. UPCitemdb (por EAN)
 *   2. GTINHub (opcional, GTINHUB_API_KEY)
 * Não usa a etiqueta energética EPREL como foto do pneu.
 *
 * Uso:
 *   npm run fetch:na-images
 *   npm run fetch:na-images -- --dry-run
 *   npm run fetch:na-images -- --force
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';
import { getDbUrl } from './lib/product-enrich.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

loadEnvFiles();

const { Client } = pg;

const login = process.env.NEUMATICOS_ANDRES_LOGIN?.trim() || '';
const password = process.env.NEUMATICOS_ANDRES_PASSWORD?.trim() || '';
const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend.genasa.es').replace(
  /\/$/,
  ''
);
const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const GTINHUB = (process.env.GTINHUB_BASE_URL || 'https://gtinhub.com/api/v1').replace(/\/$/, '');
const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';

function parseArgs(argv) {
  const opts = { dryRun: false, force: false, limit: 0, delayMs: 350 };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--force') opts.force = true;
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--delay=')) opts.delayMs = Number(arg.slice(8));
  }
  return opts;
}

function normalizeEan(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function hasRealImage(images) {
  if (!Array.isArray(images) || !images.length) return false;
  const url = String(images[0] || '');
  if (!url || url.includes('placehold.co') || url.includes('text=Pneu')) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/imagem/');
}

async function verifyNaArticle(naRef, ean) {
  if (!naRef) return false;
  try {
    const res = await fetch(`${baseUrl}/api/na/getstock/${encodeURIComponent(naRef)}?post-code=75001`, {
      headers: { login, password, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const article = json.articles?.[0];
    return article?.success === 1 && Number(article.amount) > 0 && normalizeEan(article.ean) === normalizeEan(ean);
  } catch {
    return false;
  }
}

async function fetchFromUpc(ean) {
  try {
    const res = await fetch(`${UPC_TRIAL}?upc=${ean}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const item = (await res.json()).items?.[0];
    const url = item?.images?.[0];
    if (!url || !/^https?:\/\//i.test(url)) return null;
    return { url, source: 'upcitemdb', title: item.title };
  } catch {
    return null;
  }
}

async function fetchFromGtinHub(ean) {
  if (process.env.SKIP_GTINHUB === '1') return null;
  const headers = { Accept: 'application/json' };
  if (process.env.GTINHUB_API_KEY) headers['X-API-Key'] = process.env.GTINHUB_API_KEY;
  try {
    const res = await fetch(`${GTINHUB}/product/${ean}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    const url = json.product?.image_url;
    if (!json.found || !url) return null;
    return { url, source: 'gtinhub', title: json.product?.name };
  } catch {
    return null;
  }
}

async function downloadImage(url) {
  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error('Resposta HTML, não imagem');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) throw new Error('Ficheiro demasiado pequeno');
  return { buffer, contentType: ct.split(';')[0].trim() };
}

function extFromContentType(ct, url) {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  try {
    const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    /* ignore */
  }
  return 'jpg';
}

function saveLocalImage(productId, buffer, ext) {
  const dir = path.join(uploadRoot, 'product-images', productId);
  mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}.${ext}`;
  const fullPath = path.join(dir, fileName);
  writeFileSync(fullPath, buffer);
  return `/imagem/product-images/${productId}/${fileName}`;
}

async function resolveImageUrl(ean) {
  const upc = await fetchFromUpc(ean);
  if (upc) return upc;
  await new Promise((r) => setTimeout(r, 200));
  const hub = await fetchFromGtinHub(ean);
  if (hub) return hub;
  return null;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!login || !password) {
    throw new Error('Configure NEUMATICOS_ANDRES_LOGIN e NEUMATICOS_ANDRES_PASSWORD no .env.');
  }
  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();

  try {
    let query = `
      SELECT id, ean, name, brand, images, external_product_id
      FROM products
      WHERE external_supplier = 'neumaticos_andres'
        AND is_active = true
        AND COALESCE(stock_quantity, 0) > 0
        AND ean IS NOT NULL
        AND length(trim(ean)) >= 8
      ORDER BY created_at`;
    if (opts.limit > 0) query += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(query);
    const targets = opts.force ? rows : rows.filter((r) => !hasRealImage(r.images));

    console.log(`Produtos ativos em estoque NA: ${rows.length} | sem foto: ${targets.length}`);
    console.log('API NA getstock valida referência e estoque; fotos reais são localizadas por EAN via UPCitemdb/GTINHub.\n');

    let ok = 0;
    let skip = 0;
    let fail = 0;
    let naInvalid = 0;

    for (const product of targets) {
      const ean = normalizeEan(product.ean);
      const naRef = product.external_product_id;

      const valid = await verifyNaArticle(naRef || ean, ean);
      if (!valid) {
        naInvalid++;
        skip++;
        if (naInvalid <= 10) console.log(`— ref ${naRef || ean}: não confirmada com estoque disponível na API NA`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      const found = await resolveImageUrl(ean);
      if (!found) {
        skip++;
        if (skip <= 10) console.log(`— ${ean}: sem imagem externa`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      if (opts.dryRun) {
        ok++;
        const preview = found.buffer ? `buffer ${found.buffer.length}b` : found.url?.slice(0, 80);
        console.log(`[dry-run] ${ean} via ${found.source} → ${preview}`);
        await new Promise((r) => setTimeout(r, opts.delayMs));
        continue;
      }

      try {
        const { buffer, contentType } = found.buffer
          ? { buffer: found.buffer, contentType: found.contentType || 'image/png' }
          : await downloadImage(found.url);
        const ext = extFromContentType(contentType, found.url || '');
        const publicPath = saveLocalImage(product.id, buffer, ext);
        await client.query(`UPDATE products SET images = $1::text[] WHERE id = $2`, [[publicPath], product.id]);
        ok++;
        if (ok <= 15 || ok % 25 === 0) {
          console.log(`✓ ${product.brand || '?'} ${ean} via ${found.source} → ${publicPath}`);
        }
      } catch (err) {
        fail++;
        console.error(`✗ ${ean}: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, opts.delayMs));
    }

    console.log('\n--- Resumo ---');
    console.log(`Com foto gravada: ${ok}`);
    console.log(`Sem imagem encontrada: ${skip}`);
    console.log(`Erros download: ${fail}`);
    console.log(`Refs NA não confirmadas: ${naInvalid}`);
    if (skip > 0) {
      console.log('\nMuitos EANs de pneu não têm foto em UPC/GTIN públicos.');
      console.log('Para mais fotos, solicite ao fornecedor um feed de catálogo com URLs de imagem.');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
