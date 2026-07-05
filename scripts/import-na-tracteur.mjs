#!/usr/bin/env node
/**
 * Importa pneus Tracteur da API Neumáticos Andrés.
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run import:na-tracteur
 *   npm run import:na-tracteur -- --limit=150
 *   npm run import:na-tracteur -- --from=10000 --to=150000
 *   npm run import:na-tracteur -- --from=70000          # retomar após interrupção
 *   npm run import:na-tracteur -- --dry-run
 *   npm run import:na-tracteur -- --enrich
 */
import { runNaCategoryImport } from './lib/na-catalog-import.mjs';

runNaCategoryImport('Tracteur', process.argv.slice(2), {
  scriptName: 'import-na-tracteur',
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
