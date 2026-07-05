#!/usr/bin/env node
/**
 * Importa até 1000 produtos da API Neumáticos Andrés e classifica por categoria:
 * Auto, Moto, Camion, Tracteur.
 *
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 * Para importar por tipo separadamente, use:
 *   npm run import:na-auto | import:na-moto | import:na-camion | import:na-tracteur
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
import { runNaCategoryImport, loadEnvFiles } from './lib/na-catalog-import.mjs';

loadEnvFiles();
const argv = process.argv.slice(2);

if (
  !argv.includes('--no-balance') &&
  !argv.some((a) => a.startsWith('--file=')) &&
  !argv.some((a) => a.startsWith('--limit='))
) {
  const limit = Number(process.env.NA_CATALOG_LIMIT || 1000);
  argv.push('--balance', `--per-category=${Math.ceil(limit / 4)}`, `--limit=${limit}`);
}

runNaCategoryImport(null, argv, {
  scriptName: 'import-na-catalog',
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
