/**
 * Cache local de consultas GTIN (evita repetir pedidos ao GTINHub).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'gtin-names.json');

let memory = null;

function load() {
  if (memory) return memory;
  memory = {};
  if (!existsSync(CACHE_FILE)) return memory;
  try {
    memory = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    memory = {};
  }
  return memory;
}

export function getGtinCache(gtin) {
  const key = String(gtin || '').replace(/\D/g, '');
  if (!key) return null;
  const entry = load()[key];
  if (!entry) return null;
  return entry;
}

export function setGtinCache(gtin, detail) {
  const key = String(gtin || '').replace(/\D/g, '');
  const hasName = Boolean(detail?.name || detail?.fullEnrich?.name);
  if (!key || !hasName) return;
  load()[key] = {
    ...detail,
    cachedAt: new Date().toISOString(),
  };
}

export function flushGtinCache() {
  if (!memory || !Object.keys(memory).length) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(memory, null, 2));
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
