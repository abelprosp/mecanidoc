#!/usr/bin/env node
/**
 * Importa produtos da API Neumáticos Andrés (getstock em lote).
 *
 * A API não expõe catálogo — o script varre IDs de artigo até encontrar N válidos
 * (stock > 0, preço > 0, EAN válido) ou lê uma lista de ficheiro.
 *
 * Uso:
 *   npm run import:na-products
 *   npm run import:na-products -- --limit=200 --from=16000
 *   npm run import:na-products -- --file=scripts/na-articles.txt --dry-run
 *
 * Env:
 *   NEUMATICOS_ANDRES_LOGIN / NEUMATICOS_ANDRES_PASSWORD
 *   NEUMATICOS_ANDRES_BASE_URL (default: backend-pre2.genasa.es)
 *   DATABASE_URL
 *   NA_IMPORT_POST_CODE (default: 75001)
 */
import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const login = process.env.NEUMATICOS_ANDRES_LOGIN || 'godinho_joao';
const password = process.env.NEUMATICOS_ANDRES_PASSWORD || '9kDhipiV4maH';
const baseUrl = (process.env.NEUMATICOS_ANDRES_BASE_URL || 'https://backend-pre2.genasa.es').replace(
  /\/$/,
  ''
);
const dbUrl =
  process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';

function parseArgs(argv) {
  const opts = {
    limit: Number(process.env.NA_IMPORT_LIMIT || 200),
    from: Number(process.env.NA_IMPORT_FROM || 16000),
    to: Number(process.env.NA_IMPORT_TO || 50000),
    batch: Number(process.env.NA_IMPORT_BATCH || 50),
    postCode: process.env.NA_IMPORT_POST_CODE || '75001',
    category: process.env.NA_IMPORT_CATEGORY || 'Auto',
    file: null,
    dryRun: false,
    enrich: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--enrich') opts.enrich = true;
    if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    if (arg.startsWith('--from=')) opts.from = Number(arg.slice(6));
    if (arg.startsWith('--to=')) opts.to = Number(arg.slice(5));
    if (arg.startsWith('--batch=')) opts.batch = Number(arg.slice(8));
    if (arg.startsWith('--post-code=')) opts.postCode = arg.slice(12);
    if (arg.startsWith('--category=')) opts.category = arg.slice(11);
    if (arg.startsWith('--file=')) opts.file = arg.slice(7);
  }

  opts.limit = Math.min(Math.max(opts.limit, 1), 2000);
  opts.batch = Math.min(Math.max(opts.batch, 1), 100);
  return opts;
}

function normalizeEan(raw) {
  return String(raw || '').replace(/\D/g, '');
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

function loadArticlesFromFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t]/)[0]?.trim())
    .filter(Boolean);
}

async function discoverArticles(opts) {
  const found = [];
  const seen = new Set();

  if (opts.file) {
    const ids = loadArticlesFromFile(opts.file);
    for (let i = 0; i < ids.length && found.length < opts.limit; i += opts.batch) {
      const batch = ids.slice(i, i + opts.batch);
      const articles = await fetchStockBatch(batch, opts.postCode);
      for (const article of articles) {
        if (!isValidArticle(article)) continue;
        const key = article['product-id'] || article.ean;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(article);
        if (found.length >= opts.limit) break;
      }
      process.stdout.write(`\rFicheiro: ${Math.min(i + opts.batch, ids.length)}/${ids.length} — ${found.length} válidos`);
    }
    console.log('');
    return found;
  }

  for (let start = opts.from; start <= opts.to && found.length < opts.limit; start += opts.batch) {
    const batch = Array.from({ length: opts.batch }, (_, i) => String(start + i));
    const articles = await fetchStockBatch(batch, opts.postCode);
    for (const article of articles) {
      if (!isValidArticle(article)) continue;
      const key = article['product-id'] || article.ean;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(article);
      if (found.length >= opts.limit) break;
    }
    process.stdout.write(
      `\rVarredura ${start}-${start + opts.batch - 1} — ${found.length}/${opts.limit} produtos`
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('');
  return found;
}

function detectCategory(ean) {
  const h = lookupHeuristicsImport(ean, null);
  return h?.category || 'Auto';
}

function lookupHeuristicsImport(gtin, naRef) {
  const PREFIX_RULES = [
    { prefix: '3831126', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
    { prefix: '4019238', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
    { prefix: '4050496', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
    { prefix: '8808956', brand: 'Nexen', category: 'Auto', vehicleType: 'Auto' },
    { prefix: '8807622', brand: 'Hankook', category: 'Auto', vehicleType: 'Auto' },
    { prefix: '8590341', brand: 'Barum', category: 'Auto', vehicleType: 'Auto' },
  ];
  const ean = normalizeEan(gtin);
  const rule =
    PREFIX_RULES.find((r) => ean.startsWith(r.prefix)) ||
    (ean.startsWith('383') ? { brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' } : null);
  if (!rule) return null;
  const refPart = naRef ? ` · Ref. ${naRef}` : '';
  return {
    name: `${rule.brand} Pneu${refPart}`,
    brand: rule.brand,
    category: rule.category,
    description: `Pneu ${rule.brand}. EAN ${ean}.`,
    specs: { season: 'Été', vehicle_type: rule.vehicleType || rule.category },
  };
}

async function upsertProduct(client, article, defaultCategory) {
  const productId = String(article['product-id'] || '').trim();
  const ean = normalizeEan(article.ean);
  const category = detectCategory(ean) || defaultCategory;
  const price = Number(article.price || 0);
  const stock = Number(article.amount || 0);
  const schedule = article['schedule-details'] || [];

  const metadata = {
    source: 'import-na-products',
    supplier_price: price,
    schedule_details: schedule,
    estimated_delivery_date: schedule[0]?.['delivery-date'] ?? null,
    imported_at: new Date().toISOString(),
  };

  const name = `Pneu NA Ref. ${productId}`;
  const description = `Importado da API Neumáticos Andrés. EAN ${ean}. Stock e preço via getstock.`;

  const heuristic = lookupHeuristicsImport(ean, productId);
  const finalName = heuristic?.name || name;
  const finalBrand = heuristic?.brand || null;
  const finalCategory = heuristic?.category || category;
  const finalDescription = heuristic?.description || description;
  const finalSpecs = JSON.stringify({
    source: 'neumaticos_andres',
    na_ref: productId,
    ...(heuristic?.specs || {}),
  });

  const existing = await client.query(
    `SELECT id FROM public.products
     WHERE external_supplier = 'neumaticos_andres'
       AND (external_product_id = $1 OR ean = $2)
     LIMIT 1`,
    [productId, ean]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE public.products SET
         name = $1,
         description = $2,
         brand = $3,
         category = $4,
         specs = $5::jsonb,
         base_price = $6,
         stock_quantity = $7,
         external_metadata = $8::jsonb,
         last_stock_sync_at = now(),
         is_active = true,
         ean = $9,
         external_product_id = $10
       WHERE id = $11
       RETURNING id, name, ean, base_price, stock_quantity`,
      [
        finalName,
        finalDescription,
        finalBrand,
        finalCategory,
        finalSpecs,
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
       last_stock_sync_at, is_active, specs
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, 'neumaticos_andres', $8, $9::jsonb,
       now(), true, $10::jsonb
     )
     RETURNING id, name, ean, base_price, stock_quantity`,
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
      finalSpecs,
    ]
  );
  return { action: 'inserted', row: rows[0] };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!login || !password) {
    throw new Error('Configure NEUMATICOS_ANDRES_LOGIN e NEUMATICOS_ANDRES_PASSWORD.');
  }

  console.log(`API: ${baseUrl}`);
  console.log(
    `Meta: ${opts.limit} produto(s) | lote ${opts.batch} | CP ${opts.postCode} | categoria ${opts.category}`
  );
  if (opts.file) console.log(`Fonte: ficheiro ${opts.file}`);
  else console.log(`Varredura: artigos ${opts.from} → ${opts.to}`);
  if (opts.dryRun) console.log('Modo dry-run — nada será gravado na BD.');

  const articles = await discoverArticles(opts);
  console.log(`\n${articles.length} artigo(s) válido(s) encontrado(s).`);

  if (!articles.length) {
    console.log('Nenhum produto encontrado. Tente outro intervalo (--from) ou ficheiro com refs.');
    return;
  }

  if (opts.dryRun) {
    console.log('\nAmostra:');
    for (const a of articles.slice(0, 10)) {
      console.log(
        `  ${a['product-id']} | EAN ${a.ean} | €${a.price} | stock ${a.amount}`
      );
    }
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  try {
    await client.query('BEGIN');

    for (const article of articles) {
      try {
        const result = await upsertProduct(client, article, opts.category);
        if (result.action === 'inserted') inserted++;
        else updated++;
      } catch (err) {
        errors++;
        console.error(`Erro ${article['product-id']}: ${err.message}`);
      }
    }

    await client.query(
      `UPDATE public.global_settings SET
         na_integration_enabled = true,
         na_auto_sync_stock = true
       WHERE id IS NOT NULL`
    );

    await client.query('COMMIT');

    const { rows: total } = await client.query(
      `SELECT count(*)::int AS n FROM products WHERE external_supplier = 'neumaticos_andres'`
    );

    console.log('\n--- Resumo ---');
    console.log(`Inseridos: ${inserted}`);
    console.log(`Atualizados: ${updated}`);
    console.log(`Erros: ${errors}`);
    console.log(`Total NA na BD: ${total[0]?.n ?? '?'}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    console.log(`\nVer produtos: ${appUrl}/search?category=${encodeURIComponent(opts.category)}`);
    console.log('Enriquecer nomes/specs: npm run enrich:products');

    if (opts.enrich) {
      console.log('\nA correr enrich:products...');
      const { spawnSync } = await import('child_process');
      spawnSync('node', ['scripts/enrich-products.mjs', '--supplier=neumaticos_andres'], {
        stdio: 'inherit',
        env: process.env,
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
