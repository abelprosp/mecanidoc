#!/usr/bin/env node
/**
 * Completa as três informações da etiqueta de pneus EPREL:
 * eficiência energética (resistência ao rolamento), aderência no molhado e ruído.
 * Mantém os valores existentes e consulta apenas produtos com algum campo ausente.
 *
 * Uso:
 *   node scripts/enrich-eprel-energy.mjs --dry-run --limit=20
 *   node scripts/enrich-eprel-energy.mjs --supplier=neumaticos_andres --limit=500
 *   node scripts/enrich-eprel-energy.mjs --all-suppliers --force
 *
 * Requer DATABASE_URL e EPREL_API_KEY no ambiente ou em .env.
 */
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import {
  fetchEprelTyresByModelIdentifier,
  fetchEprelTyreByRegistrationNumber,
  mapEprelHit,
} from './lib/eprel-client.mjs';
import { getDbUrl, parseTireSpecsFromText } from './lib/product-enrich.mjs';

loadEnvFiles();

const { Client } = pg;
const LABEL_KEYS = ['fuel', 'wet', 'noise'];

function parseArgs(argv) {
  const options = {
    supplier: 'neumaticos_andres',
    allSuppliers: false,
    dryRun: false,
    force: false,
    fallbackOnly: false,
    limit: 0,
    delayMs: 1200,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--fallback-only') options.fallbackOnly = true;
    else if (arg === '--all-suppliers') options.allSuppliers = true;
    else if (arg.startsWith('--supplier=')) options.supplier = arg.slice('--supplier='.length).trim();
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--delay=')) options.delayMs = Number(arg.slice('--delay='.length));
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Opção desconhecida: ${arg}`);
  }

  if (!Number.isInteger(options.limit) || options.limit < 0) throw new Error('--limit precisa ser um inteiro >= 0');
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new Error('--delay precisa ser >= 0');
  if (!options.allSuppliers && !options.supplier) throw new Error('--supplier não pode ficar vazio');
  return options;
}

function hasMissingEnergyLabel(labels) {
  return LABEL_KEYS.some((key) => validLabelValue(key, labels?.[key]) === null);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function validLabelValue(key, value) {
  if (value === undefined || value === null || value === '') return null;
  if (key === 'fuel' || key === 'wet') {
    const grade = String(value).trim().toUpperCase();
    return /^[A-E]$/.test(grade) ? grade : null;
  }
  if (key === 'noise_class') {
    const grade = String(value).trim().toUpperCase();
    return /^[A-C]$/.test(grade) ? grade : null;
  }
  if (key === 'noise') {
    const db = Number(String(value).match(/\d{2,3}/)?.[0]);
    return Number.isFinite(db) && db >= 50 && db <= 100 ? String(db) : null;
  }
  return null;
}

function addMissingLabels(target, source) {
  const added = [];
  for (const key of [...LABEL_KEYS, 'noise_class']) {
    if (validLabelValue(key, target[key]) !== null) continue;
    const value = validLabelValue(key, source?.[key]);
    if (value !== null) {
      target[key] = value;
      added.push(key);
    }
  }
  return added;
}

function nestedStrings(value, depth = 0) {
  if (depth > 5 || value == null) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => nestedStrings(item, depth + 1));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => nestedStrings(item, depth + 1));
  return [];
}

function productTireSpecs(product) {
  const specs = { ...parseTireSpecsFromText(product.name), ...asObject(product.specs) };
  const metadata = asObject(product.external_metadata);
  for (const key of ['size', 'tyre_size', 'tire_size', 'size_designation', 'tyreDesignation', 'dimension', 'dimensions']) {
    const value = specs[key] ?? metadata[key];
    if (value == null) continue;
    Object.assign(specs, parseTireSpecsFromText(value));
  }
  for (const value of nestedStrings([product.description, metadata])) {
    Object.assign(specs, parseTireSpecsFromText(value));
  }
  return specs;
}

function tireSize(product) {
  const specs = productTireSpecs(product);
  const width = String(specs.width || '').replace(/\D/g, '');
  const height = String(specs.height || '').replace(/\D/g, '');
  const rim = String(specs.diameter || '').replace(/\D/g, '');
  return width && height && rim ? `${width}/${height} R${rim}` : null;
}

function sameEprelSize(product, hit) {
  const fields = { ...hit, ...(hit?.technicalParameters || {}) };
  const productSpecs = productTireSpecs(product);
  const designation = [
    fields.tyreDesignation,
    fields.sizeDesignationFiltered,
    fields.sizeDesignation,
    fields.tyreSizeDesignation,
    fields.modelIdentifier,
  ].filter(Boolean).join(' ');
  const hitSpecs = parseTireSpecsFromText(designation);
  const dimensions = [
    [productSpecs.width, fields.tyreSection || fields.width || hitSpecs.width],
    [productSpecs.height, fields.aspectRatio || fields.aspect_ratio || hitSpecs.height],
    [productSpecs.diameter, fields.rimDiameter || fields.rim_diameter || hitSpecs.diameter],
  ];
  return dimensions.every(([wanted, got]) => wanted && got && String(wanted).replace(/\D/g, '') === String(got).replace(/\D/g, ''));
}

function normalizeMatchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function eprelFields(hit) {
  return { ...hit, ...(hit?.technicalParameters || {}) };
}

function scoreEprelCandidate(product, hit) {
  const fields = eprelFields(hit);
  const productBrand = normalizeMatchText(product.brand_name || product.brand);
  const hitBrand = normalizeMatchText(
    fields.supplierOrTrademark || fields.brandName || fields.trademark || fields.supplierName || fields.brand || fields.organisation?.organisationName
  );
  let score = 0;
  if (productBrand && hitBrand) {
    const brandTokens = productBrand.split(' ');
    if (hitBrand === productBrand) score += 12;
    else if (brandTokens.every((token) => hitBrand.split(' ').includes(token))) score += 10;
  }

  const productSpecs = productTireSpecs(product);
  const load = String(productSpecs.load_index || '').trim();
  const candidateLoad = String(fields.loadCapacityIndex || fields.load_index || '').trim();
  if (load && candidateLoad && load === candidateLoad) score += 4;
  const speed = String(productSpecs.speed_index || '').replace(/[()]/g, '').trim().toUpperCase();
  const candidateSpeed = String(fields.speedCategorySymbol || fields.speed_rating || '').replace(/[()]/g, '').trim().toUpperCase();
  if (speed && candidateSpeed && speed === candidateSpeed) score += 4;

  const knownBrandTokens = new Set(productBrand.split(' '));
  const ignore = new Set(['xl', 'tl', 'rf', 'runflat', 'pneu', 'tyre', 'tire', 'reifen', 'summer', 'winter', 'all', 'season']);
  const productTokens = new Set(normalizeMatchText(product.name).split(' ').filter((token) =>
    token && !knownBrandTokens.has(token) && !ignore.has(token) && !/^\d+$/.test(token)
  ));
  const candidateText = [fields.commercialName, fields.modelIdentifier, fields.modelName, fields.tyreDesignation]
    .filter(Boolean).map(normalizeMatchText).join(' ');
  const candidateTokens = new Set(candidateText.split(' ').filter((token) =>
    token && !ignore.has(token) && !/^\d+$/.test(token)
  ));
  for (const token of productTokens) if (candidateTokens.has(token)) score += 2;
  return score;
}

async function fetchEprelLabelBySize(product) {
  const size = tireSize(product);
  if (!size) return { detail: null, reason: 'medida ausente no nome e nas especificações', size: null };
  const rows = await fetchEprelTyresByModelIdentifier(size, { strict: true });
  const exact = rows.filter((row) => sameEprelSize(product, row));
  if (!exact.length) return { detail: null, reason: `EPREL não retornou registro com medida ${size}`, size };

  let candidates = exact;
  if (exact.length > 1) {
    const ranked = exact.map((row) => ({ row, score: scoreEprelCandidate(product, row) })).sort((a, b) => b.score - a.score);
    if (ranked[0].score > 0 && (ranked.length === 1 || ranked[0].score > ranked[1].score)) {
      candidates = [ranked[0].row];
    }
  }
  if (candidates.length > 1) {
    const labelSets = candidates.map((row) => {
      const mapped = mapEprelHit(row)?.labels || {};
      return [mapped.fuel || null, mapped.wet || null, mapped.noise || null];
    });
    const signatures = new Set(labelSets.map((labels) => JSON.stringify(labels)));
    if (labelSets.some((labels) => labels.every((value) => value === null))) {
      return { detail: null, reason: `${candidates.length} registros EPREL para ${size}, sem etiquetas suficientes para desambiguar`, size };
    }
    if (signatures.size !== 1) return { detail: null, reason: `${candidates.length} registros EPREL para ${size} com etiquetas diferentes`, size };
  }

  const row = candidates[0];
  const registrationNumber = row.eprelRegistrationNumber || row.registrationNumber || row.id;
  const fullHit = registrationNumber
    ? await fetchEprelTyreByRegistrationNumber(registrationNumber, { strict: true })
    : row;
  if (!fullHit) return { detail: null, reason: 'registro EPREL não pôde ser carregado', size };
  const detail = mapEprelHit(fullHit);
  if (!detail?.labels || !sameEprelSize(product, fullHit)) {
    return { detail: null, reason: 'registro EPREL sem etiqueta ou sem confirmação da variante', size };
  }
  return { detail, reason: null, size };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log([
      'Busca etiquetas exclusivamente no EPREL para produtos que já passaram pelo enriquecimento de dados.',
      '',
      'Opções: --dry-run | --force | --supplier=neumaticos_andres | --all-suppliers',
      '        --limit=500 | --delay=1200 | --help',
      'A busca por medida usa EPREL_API_KEY e consulta o grupo público de pneus do EPREL.',
    ].join('\n'));
    return;
  }
  if (!process.env.EPREL_API_KEY?.trim()) throw new Error('Defina EPREL_API_KEY da EPREL no .env ou no ambiente.');

  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();
  let interrupted = false;
  process.on('SIGINT', () => {
    interrupted = true;
    console.log('\nInterrompido. As atualizações já gravadas permanecem no banco.');
  });

  try {
    const where = [
      `(
        nullif(p.external_metadata->'catalog_enrich'->>'enrichedAt', '') IS NOT NULL
        OR nullif(p.external_metadata->'gtin_enrich'->>'enrichedAt', '') IS NOT NULL
        OR nullif(p.external_metadata->'eprel_enrich'->>'enrichedAt', '') IS NOT NULL
        OR (
          nullif(p.specs->>'width', '') IS NOT NULL
          AND nullif(p.specs->>'height', '') IS NOT NULL
          AND nullif(p.specs->>'diameter', '') IS NOT NULL
        )
      )`,
    ];
    const params = [];
    if (!options.allSuppliers) {
      params.push(options.supplier);
      where.push(`p.external_supplier = $${params.length}`);
    }

    let sql = `
      SELECT p.id, p.ean, p.name, p.description, p.brand, p.specs, p.labels, p.external_metadata,
             b.name AS brand_name
      FROM public.products p
      LEFT JOIN public.brands b ON b.id = p.brand_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.created_at`;
    if (options.limit > 0) sql += ` LIMIT ${options.limit}`;

    const { rows } = await client.query(sql, params);
    const targets = options.force ? rows : rows.filter((row) => hasMissingEnergyLabel(row.labels));
    console.log(`Produtos já enriquecidos selecionados: ${rows.length} | com etiqueta EPREL pendente: ${targets.length}`);
    console.log(`Fornecedor: ${options.allSuppliers ? 'todos' : options.supplier} | intervalo: ${options.delayMs} ms`);
    console.log('Fonte: EPREL (busca exclusivamente por medida)');
    if (options.dryRun) console.log('Modo dry-run: nenhuma alteração será gravada.');

    let updated = 0;
    let noLabel = 0;
    let errors = 0;
    let sizeFallbacks = 0;

    for (const product of targets) {
      if (interrupted) break;
      const productRef = String(product.ean || product.id);
      const labels = asObject(product.labels);
      const labelSources = asObject(labels.label_sources);
      let sizeLookupReason = '';
      let addedCount = 0;
      if (LABEL_KEYS.some((key) => validLabelValue(key, labels[key]) === null)) {
        try {
          const sizeLookup = await fetchEprelLabelBySize(product);
          if (sizeLookup.detail?.labels) {
            const added = addMissingLabels(labels, sizeLookup.detail.labels);
            if (added.length) {
              addedCount += added.length;
              sizeFallbacks++;
              for (const key of added) {
                labelSources[key] = {
                  source: 'EPREL, busca por medida',
                  url: `https://eprel.ec.europa.eu/screen/product/tyres/${encodeURIComponent(sizeLookup.detail.registrationNumber)}`,
                  registration_number: sizeLookup.detail.registrationNumber,
                  size: sizeLookup.size,
                };
              }
              console.log(`↳ ${productRef}: EPREL ${sizeLookup.size} (${added.join(', ')})`);
            }
          } else {
            sizeLookupReason = `busca por medida não realizada/concluída: ${sizeLookup.reason}`;
          }
        } catch (error) {
          errors++;
          console.log(`✗ ${productRef}: busca EPREL por medida — ${error instanceof Error ? error.message : 'erro na consulta'}`);
        }
      }

      labels.label_sources = labelSources;
      const remainingMissing = LABEL_KEYS.some((key) => validLabelValue(key, labels[key]) === null);
      if (!addedCount && remainingMissing) {
        noLabel++;
        const details = [
          sizeLookupReason,
        ].filter(Boolean).join(' | ');
        console.log(`— ${productRef}: ${details || `nenhuma etiqueta EPREL encontrada para ${tireSize(product) || 'medida ausente'}`}`);
      } else if (addedCount) {
        const summary = LABEL_KEYS.map((key) => `${key}=${labels[key] || '-'}`).join(' ');
        if (options.dryRun) {
          updated++;
          console.log(`[dry-run] ${productRef}: ${summary}`);
        } else {
          await client.query('UPDATE public.products SET labels = $2::jsonb WHERE id = $1', [product.id, JSON.stringify(labels)]);
          updated++;
          console.log(`✓ ${productRef}: ${summary}`);
        }
      }
      if (options.delayMs) await sleep(options.delayMs);
    }

    console.log(`\nResumo: ${updated} produtos atualizados${options.dryRun ? ' (simulação)' : ''}, ${sizeFallbacks} preenchidos pela busca EPREL por medida, ${noLabel} sem etiquetas EPREL correspondentes, ${errors} erros de consulta.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
