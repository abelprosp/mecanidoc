#!/usr/bin/env node
/**
 * Importa pneus Camion da API Neumáticos Andrés.
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run import:na-camion
 *   npm run import:na-camion -- --limit=150
 *   npm run import:na-camion -- --from=10000 --to=150000
 *   npm run import:na-camion -- --from=55000          # retomar após interrupção
 *   npm run import:na-camion -- --dry-run
 *   npm run import:na-camion -- --enrich
 */
import { runNaCategoryImport } from './lib/na-catalog-import.mjs';

runNaCategoryImport('Camion', process.argv.slice(2), {
  scriptName: 'import-na-camion',
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
