/**
 * Importação NA por categoria — grava cada produto na BD assim que é encontrado.
 * Se o script for interrompido (Ctrl+C), os produtos já gravados permanecem.
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './load-env.mjs';
import {
  PRODUCT_CATEGORIES,
  buildProductMeta,
  detectProductCategory,
  normalizeEan,
} from './na-category-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';

export function parseImportArgs(argv, defaults = {}) {
  const opts = {
    limit: Number(process.env.NA_CATALOG_LIMIT || defaults.limit || 250),
    from: Number(process.env.NA_CATALOG_FROM || defaults.from || 10000),
    to: Number(process.env.NA_CATALOG_TO || defaults.to || 150000),
    batch: Number(process.env.NA_IMPORT_BATCH || 50),
    postCode: process.env.NA_IMPORT_POST_CODE || '75001',
    delayMs: Number(process.env.NA_IMPORT_DELAY_MS || 200),
    classifyUpc: false,
    dryRun: false,
    enrich: false,
    file: null,
    category: defaults.category || null,
    balance: false,
    perCategory: 0,
    ...defaults,
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
    if (arg.startsWith('--category=')) opts.category = arg.slice(11);
  }

  opts.limit = Math.min(Math.max(opts.limit, 1), 5000);
  opts.batch = Math.min(Math.max(opts.batch, 1), 100);
  return opts;
}

function getCredentials() {
  const login = process.env.NEUMATICOS_ANDRES_LOGIN || 'godinho_joao';
  const password = process.env.NEUMATICOS_ANDRES_PASSWORD || '9kDhipiV4maH';
  const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend-pre2.genasa.es').replace(
    /\/$/,
    ''
  );
  const dbUrl =
    process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';
  return { login, password, baseUrl, dbUrl };
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

async function fetchStockBatch(baseUrl, login, password, articleNumbers, postCode) {
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

async function upsertProduct(client, entry, sourceTag) {
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
  const finalDescription = meta.description;
  const finalSpecs = {
    ...meta.specs,
    ...(upc?.specs || {}),
  };

  if (upc?.title && !finalBrand) {
    finalName = upc.title;
  }

  const metadata = {
    source: sourceTag,
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

function emptyCategoryCounts() {
  return Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c, 0]));
}

function canAcceptCategory(counts, category, opts) {
  if (!opts.balance) {
    if (opts.category) return category === opts.category;
    return true;
  }
  return (counts[category] || 0) < opts.perCategory;
}

function matchesTargetCategory(category, opts) {
  if (opts.balance) return true;
  if (!opts.category) return true;
  return category === opts.category;
}

function totalAccepted(counts, opts) {
  if (opts.category && !opts.balance) {
    return counts[opts.category] || 0;
  }
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function printProgress(opts, start, counts, saved, lastRef) {
  const accepted = totalAccepted(counts, opts);
  const label = opts.category || 'todas';
  const parts = opts.balance
    ? `[Auto:${counts.Auto} Moto:${counts.Moto} Camion:${counts.Camion} Tracteur:${counts.Tracteur}]`
    : `[${label}: ${accepted}/${opts.limit}]`;
  process.stdout.write(
    `\rVarredura ${start}-${start + opts.batch - 1} | gravados ${saved.inserted}+${saved.updated} | ${parts} | última ref ${lastRef || '-'}`
  );
}

function printSummary(counts, label, opts) {
  console.log(`\n--- ${label} ---`);
  if (opts.category && !opts.balance) {
    console.log(`  ${opts.category}: ${counts[opts.category] || 0}`);
    return;
  }
  for (const cat of PRODUCT_CATEGORIES) {
    console.log(`  ${cat.padEnd(10)}: ${counts[cat] || 0}`);
  }
  console.log(`  ${'TOTAL'.padEnd(10)}: ${totalAccepted(counts, opts)}`);
}

async function enableNaIntegration(client) {
  await client.query(
    `UPDATE public.global_settings SET
       na_integration_enabled = true,
       na_auto_sync_stock = true
     WHERE id IS NOT NULL`
  );
}

async function printDbTotals(client) {
  const { rows: dbCounts } = await client.query(
    `SELECT category, count(*)::int AS n
     FROM products
     WHERE external_supplier = 'neumaticos_andres'
     GROUP BY category
     ORDER BY n DESC`
  );
  console.log('\n--- Total NA na BD por categoria ---');
  for (const row of dbCounts) {
    console.log(`  ${(row.category || '?').padEnd(10)}: ${row.n}`);
  }
}

function setupGracefulExit(onStop) {
  let stopping = false;
  const handler = () => {
    if (stopping) return;
    stopping = true;
    console.log('\n\nInterrompido — produtos já gravados permanecem na BD.');
    onStop?.();
    process.exit(130);
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  return () => {
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
  };
}

async function maybeRunEnrich() {
  console.log('\nEnriquecer nomes/medidas: npm run enrich:products -- --supplier=neumaticos_andres');
  const { spawnSync } = await import('child_process');
  spawnSync('node', ['scripts/enrich-products.mjs', '--supplier=neumaticos_andres'], {
    stdio: 'inherit',
    env: { ...process.env, SKIP_GTINHUB: process.env.SKIP_GTINHUB || '1' },
  });
}

/**
 * Importa produtos NA, gravando cada um na BD imediatamente.
 * @param {import('./na-category-rules.mjs').PRODUCT_CATEGORIES[number] | null} fixedCategory
 * @param {string[]} argv
 * @param {{ scriptName?: string }} meta
 */
export async function runNaCategoryImport(fixedCategory, argv = [], meta = {}) {
  loadEnvFiles();
  const { login, password, baseUrl, dbUrl } = getCredentials();
  const opts = parseImportArgs(argv, { category: fixedCategory });
  const sourceTag = meta.scriptName || 'import-na-catalog';

  if (!login || !password) {
    throw new Error('Configure NEUMATICOS_ANDRES_LOGIN e NEUMATICOS_ANDRES_PASSWORD.');
  }

  if (opts.category && !PRODUCT_CATEGORIES.includes(opts.category)) {
    throw new Error(`Categoria inválida: ${opts.category}. Use: ${PRODUCT_CATEGORIES.join(', ')}`);
  }

  console.log(`API: ${baseUrl}`);
  console.log(`Script: ${sourceTag}`);
  if (opts.category && !opts.balance) {
    console.log(`Categoria: ${opts.category} | meta: ${opts.limit} produto(s)`);
  } else if (opts.balance) {
    console.log(`Modo balanceado: até ${opts.perCategory} por categoria`);
  } else {
    console.log(`Meta: ${opts.limit} produto(s)`);
  }
  console.log(`Lote ${opts.batch} | CP ${opts.postCode}`);
  if (opts.classifyUpc) console.log('Classificação UPCitemdb ativa (mais lento).');
  if (opts.file) console.log(`Fonte: ficheiro ${opts.file}`);
  else console.log(`Varredura: artigos ${opts.from} → ${opts.to}`);
  if (opts.dryRun) console.log('Modo dry-run — nada será gravado na BD.');
  else console.log('Gravação incremental: cada produto é salvo assim que encontrado.');

  const seen = new Set();
  const counts = emptyCategoryCounts();
  const savedCounts = emptyCategoryCounts();
  const upcCache = new Map();
  const saved = { inserted: 0, updated: 0, errors: 0 };
  let lastRef = null;
  let client = null;

  if (!opts.dryRun) {
    const { Client } = pg;
    client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
    } catch (err) {
      const masked = dbUrl.replace(/:[^:@/]+@/, ':***@');
      const onLocalhost = /@(localhost|127\.0\.0\.1|::1)/.test(dbUrl);
      let hint = '\nConfirme DATABASE_URL no .env e que o Postgres está a correr.';
      if (onLocalhost) {
        hint =
          '\n\nNa VPS o Postgres Docker muitas vezes NÃO expõe a porta no host.' +
          '\nOpção A — correr via rede Docker (recomendado):' +
          '\n  npm run import:na-auto:vps -- --limit=500' +
          '\n  ou: bash scripts/vps-import.sh import-na-auto.mjs --limit=500' +
          '\n\nOpção B — expor Postgres no host (docker-compose.yml ports: "5432:5432")' +
          '\n  e usar: DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc' +
          (dbUrl.includes(':5433')
            ? '\n\nNota: porta 5433 é só dev local — na VPS use 5432.'
            : '');
      }
      throw new Error(`Não foi possível ligar à BD (${masked}): ${err.message}${hint}`);
    }
  }

  const cleanupExit = setupGracefulExit(async () => {
    if (client) await client.end().catch(() => {});
  });

  const tryAccept = async (article) => {
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

    if (!matchesTargetCategory(category, opts)) return false;
    if (!canAcceptCategory(counts, category, opts)) return false;

    seen.add(key);
    counts[category] = (counts[category] || 0) + 1;
    lastRef = naRef;

    const entry = { article, category, upc };

    if (opts.dryRun) {
      console.log(
        `\n  [${category}] ref ${naRef} | EAN ${ean} | €${article.price} | stock ${article.amount}`
      );
      savedCounts[category] = (savedCounts[category] || 0) + 1;
      return true;
    }

    try {
      const result = await upsertProduct(client, entry, sourceTag);
      savedCounts[category] = (savedCounts[category] || 0) + 1;
      if (result.action === 'inserted') saved.inserted++;
      else saved.updated++;
      console.log(
        `\n✓ ${result.action} [${category}] ref ${naRef} | ${result.row.name?.slice(0, 60) || ean}`
      );
    } catch (err) {
      saved.errors++;
      console.error(`\n✗ Erro ref ${naRef}: ${err.message}`);
    }

    return true;
  };

  try {
    if (opts.file) {
      const fs = await import('fs');
      const ids = fs
        .readFileSync(opts.file, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.split(/[,;\t]/)[0]?.trim())
        .filter(Boolean);

      for (let i = 0; i < ids.length && totalAccepted(counts, opts) < opts.limit; i += opts.batch) {
        const batch = ids.slice(i, i + opts.batch);
        const articles = await fetchStockBatch(baseUrl, login, password, batch, opts.postCode);
        for (const article of articles) {
          await tryAccept(article);
          if (totalAccepted(counts, opts) >= opts.limit) break;
        }
        printProgress(opts, i, counts, saved, lastRef);
      }
    } else {
      for (
        let start = opts.from;
        start <= opts.to && totalAccepted(counts, opts) < opts.limit;
        start += opts.batch
      ) {
        const batch = Array.from({ length: opts.batch }, (_, i) => String(start + i));
        const articles = await fetchStockBatch(baseUrl, login, password, batch, opts.postCode);
        for (const article of articles) {
          await tryAccept(article);
          if (totalAccepted(counts, opts) >= opts.limit) break;
        }
        printProgress(opts, start, counts, saved, lastRef);
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }
    }

    console.log('');
    printSummary(counts, 'Produtos aceites nesta execução', opts);

    if (!totalAccepted(counts, opts)) {
      console.log('\nNenhum produto encontrado. Amplie o intervalo (--from / --to) ou use --file.');
      if (lastRef) console.log(`Última ref processada: ${lastRef}`);
      return;
    }

    if (opts.dryRun) return;

    await enableNaIntegration(client);
    await printDbTotals(client);

    console.log('\n--- Resumo gravação ---');
    console.log(`Inseridos: ${saved.inserted}`);
    console.log(`Atualizados: ${saved.updated}`);
    console.log(`Erros: ${saved.errors}`);
    printSummary(savedCounts, 'Gravados nesta execução', opts);

    if (lastRef) {
      const nextFrom = Number(lastRef) + 1;
      console.log(`\nPara retomar a varredura: --from=${nextFrom}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    console.log('\nVer no site:');
    console.log(`  Auto:     ${appUrl}/`);
    console.log(`  Moto:     ${appUrl}/moto`);
    console.log(`  Camion:   ${appUrl}/camion`);
    console.log(`  Tracteur: ${appUrl}/tracteurs`);

    if (opts.enrich) {
      console.log('\nA correr enrich:products...');
      await maybeRunEnrich();
    } else {
      console.log('\nEnriquecer: npm run enrich:products -- --supplier=neumaticos_andres');
    }
  } finally {
    cleanupExit();
    if (client) await client.end();
  }
}
