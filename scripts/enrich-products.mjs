#!/usr/bin/env node
/**
 * Enriquece produtos na BD: EPREL (opcional) → GTINHub → UPCitemdb → heurísticas EAN.
 *
 * Uso:
 *   npm run enrich:products
 *   npm run enrich:products -- --supplier=neumaticos_andres
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFiles } from './lib/load-env.mjs';
import {
  fetchEprelProductByGtin,
  fetchEprelLabelPng,
} from './lib/eprel-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

loadEnvFiles();

const { Client } = pg;

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';

const GTINHUB = (process.env.GTINHUB_BASE_URL || 'https://gtinhub.com/api/v1').replace(/\/$/, '');
const UPC_TRIAL = 'https://api.upcitemdb.com/prod/trial/lookup';
const EPREL_BASE = (process.env.EPREL_BASE_URL || 'https://eprel.ec.europa.eu/api').replace(/\/$/, '');

function hasRealImage(images) {
  if (!Array.isArray(images) || !images.length) return false;
  const url = String(images[0] || '');
  if (!url || url.includes('placehold.co') || url.includes('text=Pneu')) return false;
  return true;
}

function saveEprelLabelImage(productId, buffer) {
  const uploadRoot = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
  const dir = path.join(uploadRoot, 'product-images', productId);
  mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-eprel.png`;
  writeFileSync(path.join(dir, fileName), buffer);
  return `/imagem/product-images/${productId}/${fileName}`;
}

async function attachEprelLabelImage(product, detail) {
  if (!detail?.registrationNumber || hasRealImage(product.images)) return detail;
  const label = await fetchEprelLabelPng(detail.registrationNumber, detail.productGroup || 'tyres');
  if (!label) return detail;
  return { ...detail, imagePath: saveEprelLabelImage(product.id, label.buffer) };
}

const PREFIX_RULES = [
  { prefix: '3831126', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '3831127', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '4019238', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '4024068', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '4050496', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8808956', brand: 'Nexen', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8807622', brand: 'Hankook', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8808563', brand: 'Kumho', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8590341', brand: 'Barum', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '6959956', brand: 'Triangle', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8903635', brand: 'MRF', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '3528703', brand: 'Kleber', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8019227', brand: 'Pirelli', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '3286340', brand: 'Sava', category: 'Auto', vehicleType: 'Auto' },
];

const TIRE_CATALOG = {
  '3831126100834': {
    source: 'tire_catalog',
    name: 'Mitas Sport Force+ 160/60 ZR17 69W TL',
    brand: 'Mitas',
    category: 'Moto',
    description: 'Pneu arrière tubeless radial Mitas Sport Force+ 160/60 ZR17 69W.',
    specs: {
      width: '160', height: '60', diameter: '17', load_index: '69', speed_index: 'W',
      season: 'Été', vehicle_type: 'Moto', tube_type: 'TL', model: 'Sport Force+',
    },
  },
};

function normalizeGtin(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function lookupHeuristics(gtin, naRef) {
  const ean = normalizeGtin(gtin);
  const rule =
    PREFIX_RULES.find((r) => ean.startsWith(r.prefix)) ||
    (ean.startsWith('383') ? { brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' } : null);
  if (!rule) return null;
  const refPart = naRef ? ` · Ref. ${naRef}` : '';
  return {
    source: 'ean_heuristics',
    name: `${rule.brand} Pneu${refPart}`,
    brand: rule.brand,
    category: rule.category,
    description: `Pneu ${rule.brand}. EAN ${ean}${naRef ? ` — ref. ${naRef}` : ''}.`,
    specs: { season: 'Été', vehicle_type: rule.vehicleType || rule.category },
  };
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

function applyParsedSpecs(detail) {
  if (detail.specs?.width) return detail;
  const parsed = parseTireSpecsFromText(detail.name || '');
  if (!parsed.width) return detail;
  return { ...detail, specs: { ...(detail.specs || {}), ...parsed } };
}

async function fetchFromEprel(gtin) {
  if (!process.env.EPREL_API_KEY?.trim()) return null;
  return fetchEprelProductByGtin(gtin);
}

async function fetchFromGtinHub(gtin) {
  if (process.env.SKIP_GTINHUB === '1') return null;
  const headers = { Accept: 'application/json' };
  if (process.env.GTINHUB_API_KEY) headers['X-API-Key'] = process.env.GTINHUB_API_KEY;
  try {
    const res = await fetch(`${GTINHUB}/product/${gtin}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.found || !json.product) return null;
    const p = json.product;
    return { source: 'gtinhub', name: p.name, brand: p.brand, description: p.description, category: p.category, imageUrl: p.image_url, specs: {} };
  } catch { return null; }
}

async function fetchFromUpcItemDb(gtin) {
  try {
    const res = await fetch(`${UPC_TRIAL}?upc=${gtin}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const item = (await res.json()).items?.[0];
    if (!item) return null;
    return { source: 'upcitemdb', name: item.title, brand: item.brand, description: item.description, category: item.category, imageUrl: item.images?.[0], specs: {} };
  } catch { return null; }
}

async function fetchProductByGtin(gtin, naRef) {
  const normalized = normalizeGtin(gtin);
  const eprel = await fetchFromEprel(normalized);
  if (eprel?.specs?.width) return eprel;

  const hub = await fetchFromGtinHub(normalized);
  if (hub?.name) return applyParsedSpecs({ ...hub, labels: eprel?.labels, specs: { ...eprel?.specs, ...hub.specs } });

  const upc = await fetchFromUpcItemDb(normalized);
  if (upc?.name) return applyParsedSpecs({ ...upc, labels: eprel?.labels, specs: { ...eprel?.specs, ...upc.specs } });

  const catalog = TIRE_CATALOG[normalized];
  if (catalog) return applyParsedSpecs(catalog);
  if (eprel) return eprel;

  const heuristic = lookupHeuristics(normalized, naRef);
  return heuristic ? applyParsedSpecs(heuristic) : null;
}

function isPlaceholderName(name) {
  if (!name) return true;
  const n = name.toLowerCase();
  return (
    n.includes('exemplo') ||
    n.includes('pneu na') ||
    /^pneu na ref\./i.test(name) ||
    /^(mitas|continental|nexen|hankook|barum|pirelli|kumho|kleber|triangle|mrf|sava)\s+pneu\b/i.test(name)
  );
}

function isPlaceholderBrand(brand) {
  if (!brand) return true;
  const b = brand.toLowerCase();
  return b.includes('neumáticos andrés') || b.includes('neumaticos andres') || b.includes('exemplo');
}

function isPlaceholderDescription(description) {
  if (!description) return true;
  const d = description.toLowerCase();
  return d.includes('demonstr') || d.includes('exemplo') || d.includes('getstock') || d.includes('importado da api');
}

function isPlaceholderCategory(category, patchCategory) {
  if (!patchCategory) return false;
  if (!category) return true;
  if (category === 'Auto' && patchCategory === 'Moto') return true;
  return false;
}

function shouldUpdateCategory(current, patchCategory, detailSource) {
  if (!patchCategory) return false;
  if (!current) return true;
  if (current === patchCategory) return false;
  if (detailSource === 'eprel' && (patchCategory === 'Camion' || patchCategory === 'Tracteur')) return true;
  if (current === 'Auto' && patchCategory !== 'Auto') return true;
  if (current === 'Auto' && patchCategory === 'Moto') return true;
  return false;
}

function buildPatch(product, detail) {
  const patch = {};
  const fromEprel = detail.source === 'eprel';

  if (detail.name && (isPlaceholderName(product.name) || fromEprel)) patch.name = detail.name;
  if (detail.brand && (isPlaceholderBrand(product.brand) || fromEprel)) patch.brand = detail.brand;
  if (shouldUpdateCategory(product.category, detail.category, detail.source)) patch.category = detail.category;
  if (detail.description && (isPlaceholderDescription(product.description) || fromEprel)) {
    patch.description = detail.description;
  }
  if (detail.imagePath) patch.images = [detail.imagePath];
  else if (detail.imageUrl && !hasRealImage(product.images)) patch.images = [detail.imageUrl];

  const specs = { ...(typeof product.specs === 'object' && product.specs ? product.specs : {}), ...(detail.specs || {}) };
  if (!specs.width) Object.assign(specs, parseTireSpecsFromText(detail.name || product.name || ''));
  if (Object.keys(specs).length) patch.specs = specs;

  if (fromEprel && detail.labels) patch.labels = detail.labels;
  else if (detail.labels) patch.labels = { ...(product.labels || {}), ...detail.labels };

  const meta = { ...(product.external_metadata || {}) };
  meta.gtin_enrich = {
    gtin: normalizeGtin(product.ean),
    source: detail.source,
    eprelRegistrationNumber: detail.registrationNumber || null,
    enrichedAt: new Date().toISOString(),
  };
  patch.external_metadata = meta;
  return patch;
}

function parseArgs(argv) {
  const ids = [];
  let supplier = null;
  for (const arg of argv) {
    if (arg.startsWith('--id=')) ids.push(arg.slice(5));
    if (arg.startsWith('--supplier=')) supplier = arg.slice(11);
  }
  return { ids, supplier };
}

async function main() {
  const { ids, supplier } = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const select = `SELECT id, ean, name, description, brand, category, images, specs, labels, external_metadata, external_product_id
         FROM products WHERE `;
    let rows;
    if (ids.length) {
      ({ rows } = await client.query(`${select} id = ANY($1::uuid[])`, [ids]));
    } else if (supplier) {
      ({ rows } = await client.query(`${select} external_supplier = $1 AND ean IS NOT NULL`, [supplier]));
    } else {
      ({ rows } = await client.query(`${select} external_supplier = 'neumaticos_andres' AND ean IS NOT NULL ORDER BY created_at`));
    }

    if (!rows.length) {
      console.log('Nenhum produto encontrado.');
      return;
    }

    console.log(`${rows.length} produto(s) a enriquecer...`);
    if (process.env.EPREL_API_KEY) console.log('Fonte EPREL ativa.');
    let ok = 0, skip = 0;

    for (const product of rows) {
      const naRef = product.external_product_id || product.specs?.na_ref || null;
      let detail = await fetchProductByGtin(product.ean, naRef);

      // Sempre tentar imagem EPREL por EAN (mesmo se dados vieram de heurística/GTIN)
      if (process.env.EPREL_API_KEY?.trim()) {
        const eprelForImage =
          detail?.source === 'eprel' && detail.registrationNumber
            ? detail
            : await fetchEprelProductByGtin(product.ean);
        if (eprelForImage?.registrationNumber) {
          const withImage = await attachEprelLabelImage(product, eprelForImage);
          if (withImage.imagePath) {
            detail = { ...(detail || eprelForImage), imagePath: withImage.imagePath };
          } else if (!detail && eprelForImage) {
            detail = eprelForImage;
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!detail) {
        console.log(`${product.ean}: não encontrado`);
        skip++;
        continue;
      }

      const patch = buildPatch(product, detail);
      if (!Object.keys(patch).filter((k) => k !== 'external_metadata').length) {
        skip++;
        continue;
      }

      await client.query(
        `UPDATE products SET
           name = COALESCE($2, name),
           brand = COALESCE($3, brand),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           images = COALESCE($6, images),
           specs = COALESCE($7::jsonb, specs),
           labels = COALESCE($8::jsonb, labels),
           external_metadata = COALESCE($9::jsonb, external_metadata)
         WHERE id = $1`,
        [
          product.id,
          patch.name || null,
          patch.brand || null,
          patch.category || null,
          patch.description || null,
          patch.images || null,
          patch.specs ? JSON.stringify(patch.specs) : null,
          patch.labels ? JSON.stringify(patch.labels) : null,
          patch.external_metadata ? JSON.stringify(patch.external_metadata) : null,
        ]
      );

      ok++;
      if (ok <= 5 || ok % 25 === 0) {
        console.log(`✓ ${product.ean} via ${detail.source} → ${patch.name || patch.brand}`);
      }
    }

    console.log(`\nConcluído: ${ok} enriquecido(s), ${skip} ignorado(s)/não encontrado(s).`);
    if (!process.env.EPREL_API_KEY) {
      console.log('\nDica: defina EPREL_API_KEY para medidas completas e etiqueta UE (fuel/wet/noise).');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
