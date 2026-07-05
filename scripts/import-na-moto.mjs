#!/usr/bin/env node
/**
 * Importa pneus Moto da API Neumáticos Andrés.
 * Grava cada produto na BD assim que encontrado — seguro interromper (Ctrl+C).
 *
 * Uso:
 *   npm run import:na-moto
 *   npm run import:na-moto -- --limit=150
 *   npm run import:na-moto -- --from=10000 --to=150000
 *   npm run import:na-moto -- --from=42000          # retomar após interrupção
 *   npm run import:na-moto -- --dry-run
 *   npm run import:na-moto -- --enrich
 */
import { runNaCategoryImport } from './lib/na-catalog-import.mjs';

runNaCategoryImport('Moto', process.argv.slice(2), {
  scriptName: 'import-na-moto',
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
