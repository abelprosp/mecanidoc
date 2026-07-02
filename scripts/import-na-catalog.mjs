#!/usr/bin/env node
/**
 * Importa até 1000 produtos da API Neumáticos Andrés e classifica por categoria:
 * Auto, Moto, Camion, Tracteur.
 *
 * A API só expõe stock/preço/EAN — a categoria é inferida por prefixo EAN,
 * palavras-chave (UPC opcional) e medidas.
 *
 * Uso:
 *   npm run import:na-catalog
 *   npm run import:na-catalog -- --limit=1000
 *   npm run import:na-catalog -- --limit=1000 --balance --per-category=250
 *   npm run import:na-catalog -- --from=10000 --to=150000 --dry-run
 *   npm run import:na-catalog -- --enrich
 *
 * Env:
 *   NEUMATICOS_ANDRES_LOGIN / NEUMATICOS_ANDRES_PASSWORD
 *   NEUMATICOS_ANDRES_BASE_URL
 *   DATABASE_URL
 *   NA_IMPORT_POST_CODE (default: 75001)
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PRODUCT_CATEGORIES,
  buildProductMeta,
  detectProductCategory,
  normalizeEan,
} from './lib/na-category-rules.mjs';

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

const login = process.env.NEUMATICOS_ANDRES_LOGIN || 'godinho_joao';
const password = process.env.NEUMATICOS_ANDRES_PASSWORD || '9kDhipiV4maH';
const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend-pre2.genasa.es').replace(
  /\/$/,
  ''
);
const dbUrl =
  process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';

const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';

function parseArgs(argv) {
  const opts = {
    limit: Number(process.env.NA_CATALOG_LIMIT || 1000),
    from: Number(process.env.NA_CATALOG_FROM || 10000),
    to: Number(process.env.NA_CATALOG_TO || 150000),
    batch: Number(process.env.NA_IMPORT_BATCH || 50),
    postCode: process.env.NA_IMPORT_POST_CODE || '75001',
    delayMs: Number(process.env.NA_IMPORT_DELAY_MS || 200),
    balance: false,
    perCategory: 0,
    classifyUpc: false,
    dryRun: false,
    enrich: false,
    file: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--enrich') opts.enrich = true;
    if (arg === '--balance') opts.balance = true;
    if (arg === '--classify-upc') opts.classifyUpc = true;
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--from=')) opts.from = Number(arg.slice(6));
    if (arg.startsWith('--to=')) opts.to = Number(arg.slice(5));
    if (arg.startsWith('--batch=')) opts.batch = Number(arg.slice(8));
    if (arg.startsWith('--post-code=')) opts.postCode = arg.slice(12);
    if (arg.startsWith('--delay=')) opts.delayMs = Number(arg.slice(8));
    if (arg.startsWith('--per-category=')) {
      opts.perCategory = Number(arg.slice(15));
      opts.balance = true;
    }
    if (arg.startsWith('--file=')) opts.file = arg.slice(7);
  }

  opts.limit = Math.min(Math.max(opts.limit, 1), 5000);
  opts.batch = Math.min(Math.max(opts.batch, 1), 100);
  if (opts.balance && !opts.perCategory) {
    opts.perCategory = Math.ceil(opts.limit / PRODUCT_CATEGORIES.length);
    opts.balance = true;
  }
  if (!argv.includes('--no-balance') && !opts.file && !argv.some((a) => a.startsWith('--limit='))) {
    opts.balance = true;
    opts.perCategory = Math.ceil(opts.limit / PRODUCT_CATEGORIES.length);
  }
  return opts;
}

function isValidArticle(article) {
  const ean = normalizeEan(article.ean);
  return (
    article.success === 1 &&
    Number(article.price) > 0 &&
    Number(article.amount) > 0 &&
    ean.length >= 8
  );
}

async function fetchStockBatch(articleNumbers, postCode) {
  const params = new URLSearchParams();
  for (const id of articleNumbers) params.append('article_numbers[]', id);
  if (postCode) params.set('post-code', postCode);

  const res = await fetch(`${baseUrl}/api/na/getstock/?${params.toString()}`, {
    headers: { login, password, Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`getstock HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.articles || [];
}

function parseTireSpecsFromText(text) {
  const specs = {};
  const t = String(text || '');
  const radial = t.match(/(\d{2,3})\s*\/\s*(\d{2})\s*(?:ZR|R)\s*(\d{2})(?:\s+(\d{2,3})\s*([A-Z]))?/i);
  if (radial) {
    specs.width = radial[1];
    specs.height = radial[2];
    specs.diameter = radial[3];
    if (radial[4]) specs.load_index = radial[4];
    if (radial[5]) specs.speed_index = radial[5].toUpperCase();
    return specs;
  }
  const moto = t.match(/(\d{2,3})\s*\/\s*(\d{2})\s*-\s*(\d{2})/);
  if (moto) {
    specs.width = moto[1];
    specs.height = moto[2];
    specs.diameter = moto[3];
  }
  return specs;
}

async function fetchUpcTitle(gtin) {
  try {
    const res = await fetch(`${UPC_TRIAL}?upc=${gtin}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const item = (await res.json()).items?.[0];
    if (!item?.title) return null;
    return {
      title: item.title,
      brand: item.brand || null,
      specs: parseTireSpecsFromText(item.title),
      imageUrl: item.images?.[0] || null,
    };
  } catch {
    return null;
  }
}

function emptyCategoryCounts() {
  return Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c, 0]));
}

function canAcceptCategory(counts, category, opts) {
  if (!opts.balance) return true;
  return (counts[category] || 0) < opts.perCategory;
}

function totalAccepted(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

async function discoverArticles(opts) {
  const found = [];
  const seen = new Set();
  const counts = emptyCategoryCounts();
  const upcCache = new Map();

  const tryAdd = async (article) => {
    if (!isValidArticle(article)) return false;
    const key = article['product-id'] || article.ean;
    if (seen.has(key)) return false;

    const ean = normalizeEan(article.ean);
    const naRef = String(article['product-id'] || '').trim();

    let upc = null;
    if (opts.classifyUpc) {
      if (!upcCache.has(ean)) {
        upcCache.set(ean, await fetchUpcTitle(ean));
        await new Promise((r) => setTimeout(r, 350));
      }
      upc = upcCache.get(ean);
    }

    const category = detectProductCategory(ean, {
      naRef,
      title: upc?.title,
      specs: upc?.specs,
    });

    if (!canAcceptCategory(counts, category, opts)) return false;

    seen.add(key);
    counts[category] = (counts[category] || 0) + 1;
    found.push({ article, category, upc });
    return true;
  };

  if (opts.file) {
    const fs = await import('fs');
    const ids = fs
      .readFileSync(opts.file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.split(/[,;\t]/)[0]?.trim())
      .filter(Boolean);

    for (let i = 0; i < ids.length && totalAccepted(counts) < opts.limit; i += opts.batch) {
      const batch = ids.slice(i, i + opts.batch);
      const articles = await fetchStockBatch(batch, opts.postCode);
      for (const article of articles) {
        await tryAdd(article);
        if (totalAccepted(counts) >= opts.limit) break;
      }
      process.stdout.write(
        `\rFicheiro: ${Math.min(i + opts.batch, ids.length)}/${ids.length} — ${totalAccepted(counts)}/${opts.limit}`
      );
    }
    console.log('');
    return { found, counts };
  }

  for (let start = opts.from; start <= opts.to && totalAccepted(counts) < opts.limit; start += opts.batch) {
    const batch = Array.from({ length: opts.batch }, (_, i) => String(start + i));
    const articles = await fetchStockBatch(batch, opts.postCode);
    for (const article of articles) {
      await tryAdd(article);
      if (totalAccepted(counts) >= opts.limit) break;
    }
    process.stdout.write(
      `\rVarredura ${start}-${start + opts.batch - 1} — ${totalAccepted(counts)}/${opts.limit} ` +
        `[Auto:${counts.Auto} Moto:${counts.Moto} Camion:${counts.Camion} Tracteur:${counts.Tracteur}]`
    );
    await new Promise((r) => setTimeout(r, opts.delayMs));
  }
  console.log('');
  return { found, counts };
}

async function upsertProduct(client, entry) {
  const { article, category, upc } = entry;
  const productId = String(article['product-id'] || '').trim();
  const ean = normalizeEan(article.ean);
  const price = Number(article.price || 0);
  const stock = Number(article.amount || 0);
  const schedule = article['schedule-details'] || [];

  const meta = buildProductMeta(ean, productId);
  const finalCategory = category || meta.category;
  let finalName = upc?.title || meta.name;
  let finalBrand = upc?.brand || meta.brand;
  let finalDescription = meta.description;
  const finalSpecs = {
    ...meta.specs,
    ...(upc?.specs || {}),
  };

  if (upc?.title && !finalBrand) {
    finalName = upc.title;
  }

  const metadata = {
    source: 'import-na-catalog',
    supplier_price: price,
    schedule_details: schedule,
    estimated_delivery_date: schedule[0]?.['delivery-date'] ?? null,
    imported_at: new Date().toISOString(),
    detected_category: finalCategory,
  };

  const existing = await client.query(
    `SELECT id FROM public.products
     WHERE external_supplier = 'neumaticos_andres'
       AND (external_product_id = $1 OR ean = $2)
     LIMIT 1`,
    [productId, ean]
  );

  const images = upc?.imageUrl ? [upc.imageUrl] : null;

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE public.products SET
         name = $1,
         description = $2,
         brand = $3,
         category = $4,
         specs = $5::jsonb,
         images = COALESCE($6, images),
         base_price = $7,
         stock_quantity = $8,
         external_metadata = $9::jsonb,
         last_stock_sync_at = now(),
         is_active = true,
         ean = $10,
         external_product_id = $11
       WHERE id = $12
       RETURNING id, name, category`,
      [
        finalName,
        finalDescription,
        finalBrand,
        finalCategory,
        JSON.stringify(finalSpecs),
        images,
        price,
        stock,
        JSON.stringify(metadata),
        ean,
        productId,
        existing.rows[0].id,
      ]
    );
    return { action: 'updated', row: rows[0] };
  }

  const { rows } = await client.query(
    `INSERT INTO public.products (
       name, description, brand, base_price, stock_quantity, category,
       ean, external_supplier, external_product_id, external_metadata,
       last_stock_sync_at, is_active, specs, images
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, 'neumaticos_andres', $8, $9::jsonb,
       now(), true, $10::jsonb, $11
     )
     RETURNING id, name, category`,
    [
      finalName,
      finalDescription,
      finalBrand,
      price,
      stock,
      finalCategory,
      ean,
      productId,
      JSON.stringify(metadata),
      JSON.stringify(finalSpecs),
      images,
    ]
  );
  return { action: 'inserted', row: rows[0] };
}

function printSummary(counts, label) {
  console.log(`\n--- ${label} ---`);
  for (const cat of PRODUCT_CATEGORIES) {
    console.log(`  ${cat.padEnd(10)}: ${counts[cat] || 0}`);
  }
  console.log(`  ${'TOTAL'.padEnd(10)}: ${totalAccepted(counts)}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!login || !password) {
    throw new Error('Configure NEUMATICOS_ANDRES_LOGIN e NEUMATICOS_ANDRES_PASSWORD.');
  }

  console.log(`API: ${baseUrl}`);
  console.log(`Meta: ${opts.limit} produto(s) | lote ${opts.batch} | CP ${opts.postCode}`);
  if (opts.balance) {
    console.log(`Modo balanceado: até ${opts.perCategory} por categoria (${PRODUCT_CATEGORIES.join(', ')})`);
  }
  if (opts.classifyUpc) console.log('Classificação UPCitemdb ativa (mais lento, melhor categoria).');
  if (opts.file) console.log(`Fonte: ficheiro ${opts.file}`);
  else console.log(`Varredura: artigos ${opts.from} → ${opts.to}`);
  if (opts.dryRun) console.log('Modo dry-run — nada será gravado na BD.');

  const { found, counts } = await discoverArticles(opts);
  printSummary(counts, 'Produtos encontrados por categoria');

  if (!found.length) {
    console.log('\nNenhum produto encontrado. Amplie o intervalo (--from / --to) ou use --file.');
    return;
  }

  if (opts.dryRun) {
    console.log('\nAmostra (10 primeiros):');
    for (const { article, category } of found.slice(0, 10)) {
      console.log(
        `  [${category}] ref ${article['product-id']} | EAN ${article.ean} | €${article.price} | stock ${article.amount}`
      );
    }
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const savedCounts = emptyCategoryCounts();
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  try {
    await client.query('BEGIN');

    for (const entry of found) {
      try {
        const result = await upsertProduct(client, entry);
        savedCounts[entry.category] = (savedCounts[entry.category] || 0) + 1;
        if (result.action === 'inserted') inserted++;
        else updated++;
      } catch (err) {
        errors++;
        console.error(`Erro ${entry.article['product-id']}: ${err.message}`);
      }
    }

    await client.query(
      `UPDATE public.global_settings SET
         na_integration_enabled = true,
         na_auto_sync_stock = true
       WHERE id IS NOT NULL`
    );

    await client.query('COMMIT');

    const { rows: dbCounts } = await client.query(
      `SELECT category, count(*)::int AS n
       FROM products
       WHERE external_supplier = 'neumaticos_andres'
       GROUP BY category
       ORDER BY n DESC`
    );

    console.log('\n--- Resumo importação ---');
    console.log(`Inseridos: ${inserted}`);
    console.log(`Atualizados: ${updated}`);
    console.log(`Erros: ${errors}`);
    printSummary(savedCounts, 'Gravados nesta execução');

    console.log('\n--- Total NA na BD por categoria ---');
    for (const row of dbCounts) {
      console.log(`  ${(row.category || '?').padEnd(10)}: ${row.n}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    console.log('\nVer no site:');
    console.log(`  Auto:     ${appUrl}/`);
    console.log(`  Moto:     ${appUrl}/moto`);
    console.log(`  Camion:   ${appUrl}/camion`);
    console.log(`  Tracteur: ${appUrl}/tracteurs`);
    console.log('\nEnriquecer nomes/medidas: npm run enrich:products -- --supplier=neumaticos_andres');

    if (opts.enrich) {
      console.log('\nA correr enrich:products...');
      const { spawnSync } = await import('child_process');
      spawnSync('node', ['scripts/enrich-products.mjs', '--supplier=neumaticos_andres'], {
        stdio: 'inherit',
        env: { ...process.env, SKIP_GTINHUB: process.env.SKIP_GTINHUB || '1' },
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
