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
import { fetchEprelProductByGtin } from './lib/eprel-client.mjs';
import { getDbUrl, normalizeGtin } from './lib/product-enrich.mjs';

loadEnvFiles();

const { Client } = pg;
const LABEL_KEYS = ['fuel', 'wet', 'noise'];

function parseArgs(argv) {
  const options = {
    supplier: 'neumaticos_andres',
    allSuppliers: false,
    dryRun: false,
    force: false,
    limit: 0,
    delayMs: 1200,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
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
  return LABEL_KEYS.some((key) => labels?.[key] === undefined || labels?.[key] === null || labels?.[key] === '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log([
      'Busca e grava as etiquetas EPREL de eficiência energética, aderência no molhado e ruído.',
      '',
      'Opções: --dry-run | --force | --supplier=neumaticos_andres | --all-suppliers',
      '        --limit=500 | --delay=1200 | --help',
    ].join('\n'));
    return;
  }
  if (!process.env.EPREL_API_KEY?.trim()) throw new Error('Defina EPREL_API_KEY no .env ou no ambiente.');

  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();
  let interrupted = false;
  process.on('SIGINT', () => {
    interrupted = true;
    console.log('\nInterrompido. As atualizações já gravadas permanecem no banco.');
  });

  try {
    const where = ['ean IS NOT NULL', "length(trim(ean)) >= 8"];
    const params = [];
    if (!options.allSuppliers) {
      params.push(options.supplier);
      where.push(`external_supplier = $${params.length}`);
    }

    let sql = `
      SELECT id, ean, name, labels
      FROM products
      WHERE ${where.join(' AND ')}
      ORDER BY created_at`;
    if (options.limit > 0) sql += ` LIMIT ${options.limit}`;

    const { rows } = await client.query(sql, params);
    const targets = options.force ? rows : rows.filter((row) => hasMissingEnergyLabel(row.labels));
    console.log(`Produtos selecionados: ${rows.length} | com etiqueta EPREL pendente: ${targets.length}`);
    console.log(`Fornecedor: ${options.allSuppliers ? 'todos' : options.supplier} | intervalo: ${options.delayMs} ms`);
    if (options.dryRun) console.log('Modo dry-run: nenhuma alteração será gravada.');

    let updated = 0;
    let notFound = 0;
    let noLabel = 0;
    let errors = 0;

    for (const product of targets) {
      if (interrupted) break;
      const ean = normalizeGtin(product.ean);
      try {
        const detail = await fetchEprelProductByGtin(ean, { strict: true });
        if (!detail) {
          notFound++;
          console.log(`— ${ean}: EAN não localizado na EPREL`);
          if (options.delayMs) await sleep(options.delayMs);
          continue;
        }

        const eprelLabels = detail?.labels || {};
        const available = Object.fromEntries(
          LABEL_KEYS.filter((key) => eprelLabels[key] !== undefined && eprelLabels[key] !== null && eprelLabels[key] !== '')
            .map((key) => [key, String(eprelLabels[key])])
        );

        if (!Object.keys(available).length) {
          noLabel++;
          console.log(`— ${ean}: registro ${detail.registrationNumber || ''} encontrado, sem dados de etiqueta`);
        } else {
          const labels = { ...(product.labels || {}), ...available };
          // Guarda também a classe de ruído, caso a EPREL tenha enviado esse dado.
          if (eprelLabels.noise_class) labels.noise_class = String(eprelLabels.noise_class);

          const summary = LABEL_KEYS.map((key) => `${key}=${labels[key] || '-'}`).join(' ');
          if (options.dryRun) {
            updated++;
            console.log(`[dry-run] ${ean}: ${summary}`);
          } else {
            await client.query('UPDATE products SET labels = $2::jsonb WHERE id = $1', [product.id, JSON.stringify(labels)]);
            updated++;
            console.log(`✓ ${ean}: ${summary}`);
          }
        }
      } catch (error) {
        errors++;
        console.log(`✗ ${ean}: ${error instanceof Error ? error.message : 'falha na consulta EPREL'}`);
      }
      if (options.delayMs) await sleep(options.delayMs);
    }

    console.log(`\nResumo: ${updated} atualizados${options.dryRun ? ' (simulação)' : ''}, ${notFound} EANs não localizados, ${noLabel} registros sem etiqueta, ${errors} erros de consulta.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
