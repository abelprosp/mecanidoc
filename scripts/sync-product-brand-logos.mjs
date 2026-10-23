#!/usr/bin/env node
/**
 * Religa produtos sem logo de marca à marca equivalente já cadastrada com logo.
 * Usa correspondência exata após normalização e alguns aliases explícitos.
 * Simula por padrão; use --apply para gravar as alterações.
 *
 * Uso:
 *   npm run sync:brand-logos -- --dry-run
 *   npm run sync:brand-logos -- --apply
 *   npm run sync:brand-logos:vps -- --apply --supplier=neumaticos_andres
 */
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import { getDbUrl } from './lib/product-enrich.mjs';

loadEnvFiles();

const { Client } = pg;

// Variações já encontradas nos dados/importadores do catálogo.
const BRAND_ALIASES = {
  'general tire': ['general'],
  giti: ['gitigroup'],
  kumho: ['khumo'],
  nexen: ['nexes'],
  matador: ['matadort'],
};

function parseArgs(argv) {
  const options = { apply: false, supplier: null, limit: 0 };
  for (const arg of argv) {
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg.startsWith('--supplier=')) options.supplier = arg.slice('--supplier='.length).trim();
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.slice('--limit='.length));
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  if (!Number.isInteger(options.limit) || options.limit < 0) throw new Error('--limit precisa ser um inteiro >= 0');
  if (options.supplier === '') throw new Error('--supplier não pode ficar vazio');
  return options;
}

function normalizeBrand(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function addCandidate(index, name, brand) {
  const key = normalizeBrand(name);
  if (!key) return;
  const candidates = index.get(key) || new Map();
  candidates.set(brand.id, brand);
  index.set(key, candidates);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log([
      'Liga produtos a marcas já cadastradas que possuem logo.',
      'Por segurança, o padrão é dry-run; use --apply para gravar.',
      '',
      'Opções: --dry-run | --apply | --supplier=neumaticos_andres | --limit=500 | --help',
    ].join('\n'));
    return;
  }

  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();
  try {
    const { rows: brands } = await client.query(`
      SELECT id, name, logo_url
      FROM public.brands
      WHERE logo_url IS NOT NULL AND length(trim(logo_url)) > 0
    `);
    const byName = new Map();
    for (const brand of brands) {
      addCandidate(byName, brand.name, brand);
      const canonical = normalizeBrand(brand.name);
      for (const alias of BRAND_ALIASES[canonical] || []) addCandidate(byName, alias, brand);
    }

    const params = [];
    const filters = [
      `coalesce(nullif(trim(p.brand), ''), nullif(trim(current_brand.name), '')) IS NOT NULL`,
      `(p.brand_id IS NULL OR current_brand.logo_url IS NULL OR length(trim(current_brand.logo_url)) = 0)`,
    ];
    if (options.supplier) {
      params.push(options.supplier);
      filters.push(`p.external_supplier = $${params.length}`);
    }
    let sql = `
      SELECT p.id, p.name AS product_name, p.brand AS product_brand,
             p.external_supplier, p.brand_id, current_brand.name AS current_brand_name
      FROM public.products p
      LEFT JOIN public.brands current_brand ON current_brand.id = p.brand_id
      WHERE ${filters.join('\n AND ')}
      ORDER BY p.created_at NULLS LAST, p.id`;
    if (options.limit > 0) {
      params.push(options.limit);
      sql += `\nLIMIT $${params.length}`;
    }
    const { rows: products } = await client.query(sql, params);

    const matches = [];
    const unmatched = [];
    const ambiguous = [];
    for (const product of products) {
      const sourceBrand = product.product_brand || product.current_brand_name;
      const candidates = byName.get(normalizeBrand(sourceBrand));
      if (!candidates?.size) {
        unmatched.push({ ...product, sourceBrand });
      } else if (candidates.size > 1) {
        ambiguous.push({ ...product, sourceBrand, candidates: [...candidates.values()] });
      } else {
        const [brand] = candidates.values();
        if (product.brand_id !== brand.id) matches.push({ ...product, sourceBrand, targetBrand: brand });
      }
    }

    console.log(`Marcas com logo disponíveis: ${brands.length}`);
    console.log(`Produtos analisados: ${products.length}${options.supplier ? ` | fornecedor: ${options.supplier}` : ''}`);
    console.log(`Correspondências seguras: ${matches.length} | sem correspondência: ${unmatched.length} | ambíguas: ${ambiguous.length}`);
    console.log(options.apply ? 'Modo apply: alterações serão gravadas.' : 'Modo dry-run: nenhuma alteração será gravada.');

    for (const product of matches) {
      console.log(`${options.apply ? '✓' : '[dry-run]'} ${product.product_name || product.id}: ${product.sourceBrand} → ${product.targetBrand.name}`);
    }
    for (const product of ambiguous) {
      console.log(`? ${product.product_name || product.id}: ${product.sourceBrand} → correspondência ambígua (${product.candidates.map((brand) => brand.name).join(', ')})`);
    }
    for (const product of unmatched.slice(0, 30)) {
      console.log(`— ${product.product_name || product.id}: sem marca com logo correspondente (${product.sourceBrand})`);
    }
    if (unmatched.length > 30) console.log(`… mais ${unmatched.length - 30} produto(s) sem correspondência`);

    if (options.apply && matches.length) {
      await client.query('BEGIN');
      try {
        for (const product of matches) {
          await client.query(
            'UPDATE public.products SET brand_id = $2 WHERE id = $1 AND brand_id IS DISTINCT FROM $2',
            [product.id, product.targetBrand.id]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      console.log(`\nProdutos atualizados: ${matches.length}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
