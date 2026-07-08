#!/usr/bin/env node
/**
 * Importa logos de src/logos para uploads/brand-logos e grava logo_url na tabela brands.
 * Associa produtos existentes às marcas pelo nome.
 *
 * Uso:
 *   npm run seed:brand-logos
 *   npm run seed:brand-logos:vps
 *   npm run seed:brand-logos -- --dry-run
 */
import pg from 'pg';
import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';

loadEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOGOS_SRC = path.join(ROOT, 'src', 'logos');
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const BRAND_BUCKET = 'brand-logos';

/** Nome do ficheiro → nome canónico da marca na BD */
const FILE_TO_BRAND = {
  'Bridgestone_logo.svg.webp': 'Bridgestone',
  'Firestone.svg.webp': 'Firestone',
  'barum.svg': 'Barum',
  'continental.svg': 'Continental',
  'general.svg': 'General Tire',
  'giti.png': 'Giti',
  'hankook.png': 'Hankook',
  'khumo.webp': 'Kumho',
  'kleber.svg': 'Kleber',
  'matadort.png': 'Matador',
  'maxxis.png': 'Maxxis',
  'michelin.svg': 'Michelin',
  'minerva.png': 'Minerva',
  'mrf.jpg': 'MRF',
  'nexes.png': 'Nexen',
  'pirelli.webp': 'Pirelli',
  'roadstone.png': 'Roadstone',
  'sava.jpeg': 'Sava',
  'triangle.webp': 'Triangle',
  'yokohama.svg': 'Yokohama',
  'images.jpeg': 'Aptany',
};

/** Variantes de nome em products.brand que ligam à marca canónica */
const BRAND_MATCH_ALIASES = {
  'General Tire': ['general tire', 'general'],
  Giti: ['giti', 'gitigroup'],
  Kumho: ['kumho', 'khumo'],
  Nexen: ['nexen', 'nexes'],
  Matador: ['matador', 'matadort'],
};

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildPublicUrl(objectPath) {
  const encoded = objectPath.split('/').map((s) => encodeURIComponent(s)).join('/');
  return `/imagem/${encodeURIComponent(BRAND_BUCKET)}/${encoded}`;
}

function getDbUrl() {
  return process.env.DATABASE_URL || 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!existsSync(LOGOS_SRC)) {
    throw new Error(`Pasta não encontrada: ${LOGOS_SRC}`);
  }

  const files = readdirSync(LOGOS_SRC).filter((f) => !f.startsWith('.'));
  const mapped = [];
  const skipped = [];

  for (const file of files) {
    const brandName = FILE_TO_BRAND[file];
    if (!brandName) {
      skipped.push(file);
      continue;
    }
    const ext = path.extname(file);
    const destName = `${slugify(brandName)}${ext}`;
    mapped.push({ file, brandName, destName });
  }

  console.log(`Logos encontrados: ${files.length}`);
  console.log(`Mapeados: ${mapped.length} | ignorados: ${skipped.length}`);
  if (skipped.length) console.log(`Ignorados (sem mapeamento): ${skipped.join(', ')}`);
  if (dryRun) console.log('\nModo dry-run — nada será gravado.\n');

  const destDir = path.join(UPLOAD_ROOT, BRAND_BUCKET);
  if (!dryRun) mkdirSync(destDir, { recursive: true });

  for (const { file, brandName, destName } of mapped) {
    const srcPath = path.join(LOGOS_SRC, file);
    const destPath = path.join(destDir, destName);
    const logoUrl = buildPublicUrl(destName);

    console.log(`\n→ ${brandName}`);
    console.log(`  ficheiro: ${file}`);
    console.log(`  url: ${logoUrl}`);

    if (!dryRun) {
      copyFileSync(srcPath, destPath);
    }
  }

  const client = new pg.Client({ connectionString: getDbUrl() });
  try {
    await client.connect();
  } catch (err) {
    if (!dryRun && mapped.length > 0) {
      console.error('\nAviso: ficheiros copiados para uploads, mas a BD não está acessível.');
      console.error('Execute novamente quando o Postgres estiver online para gravar brands e ligar produtos.');
    }
    throw err;
  }

  let brandsUpserted = 0;
  let productsLinked = 0;

  try {
    for (const { file, brandName, destName } of mapped) {
      const logoUrl = buildPublicUrl(destName);

      if (dryRun) continue;

      const { rows } = await client.query(
        `INSERT INTO public.brands (name, logo_url, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (name) DO UPDATE SET
           logo_url = EXCLUDED.logo_url,
           is_active = true
         RETURNING id, name`,
        [brandName, logoUrl]
      );
      brandsUpserted++;

      const aliases = BRAND_MATCH_ALIASES[brandName] || [brandName.toLowerCase()];
      const patterns = [...new Set([brandName.toLowerCase(), ...aliases])];

      const res = await client.query(
        `UPDATE public.products SET brand_id = $1
         WHERE brand_id IS DISTINCT FROM $1
           AND lower(trim(brand)) = ANY($2::text[])`,
        [rows[0].id, patterns]
      );
      productsLinked += res.rowCount || 0;
    }

    console.log('\n--- Resumo ---');
    if (dryRun) {
      console.log(`${mapped.length} marca(s) seriam importadas.`);
    } else {
      console.log(`Marcas gravadas/atualizadas: ${brandsUpserted}`);
      console.log(`Produtos ligados a marcas: ${productsLinked}`);
      console.log(`Ficheiros em: ${destDir}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
