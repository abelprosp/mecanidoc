#!/usr/bin/env node
/**
 * Importa pneus Auto da API Neumáticos Andrés.
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run import:na-auto
 *   npm run import:na-auto -- --limit=500
 *   npm run import:na-auto -- --from=10000 --to=80000
 *   npm run import:na-auto -- --from=26000          # retomar após interrupção
 *   npm run import:na-auto -- --dry-run
 *   npm run import:na-auto -- --enrich
 */
import { runNaCategoryImport } from './lib/na-catalog-import.mjs';

runNaCategoryImport('Auto', process.argv.slice(2), {
  scriptName: 'import-na-auto',
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
