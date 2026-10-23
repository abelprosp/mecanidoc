#!/usr/bin/env node
/**
 * Busca avaliações publicadas pela API licenciada tyre.info para pneus do catálogo.
 * Exporta candidatos com fonte e atribuição em .cache; nunca grava/publica no site.
 * Requer DATABASE_URL e TYRE_INFO_API_KEY (plano autorizado para exibição).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import { getDbUrl } from './lib/product-enrich.mjs';

loadEnvFiles();
const { Client } = pg;
const BASE = (process.env.TYRE_INFO_BASE_URL || 'https://api.tyre.info/v1').replace(/\/$/, '');
const OUT = path.resolve('.cache/product-review-candidates.json');
const SIZE_RE = /\b\d{3}\s*\/\s*\d{2,3}\s*(?:R|ZR)?\s*\d{2}(?:\s*\d{2,3}\s*[A-Z])?\b/ig;
const REF_RE = /\b(?:EAN|GTIN|SKU|REF(?:ERENCE)?)[\s:#-]*[A-Z0-9-]+\b/ig;

function args(argv) {
  const o = { supplier: 'neumaticos_andres', allSuppliers: false, limit: 100, perTyre: 5, lang: 'fr', help: false };
  for (const arg of argv) {
    if (arg === '--all-suppliers') o.allSuppliers = true;
    else if (arg === '--help' || arg === '-h') o.help = true;
    else if (arg.startsWith('--supplier=')) o.supplier = arg.slice(11).trim();
    else if (arg.startsWith('--limit=')) o.limit = Number(arg.slice(8));
    else if (arg.startsWith('--per-tyre=')) o.perTyre = Number(arg.slice(11));
    else if (arg.startsWith('--lang=')) o.lang = arg.slice(7).trim().toLowerCase();
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  if (!Number.isInteger(o.limit) || o.limit < 1) throw new Error('--limit precisa ser inteiro >= 1');
  if (!Number.isInteger(o.perTyre) || o.perTyre < 1 || o.perTyre > 20) throw new Error('--per-tyre precisa ser de 1 a 20');
  if (!/^[a-z]{2}$/.test(o.lang)) throw new Error('--lang deve ser um código de idioma de 2 letras (ex.: fr)');
  if (!o.allSuppliers && !o.supplier) throw new Error('--supplier não pode ficar vazio');
  return o;
}

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function modelQuery(product) {
  let text = String(product.name || '');
  if (product.brand_name) text = text.replace(new RegExp(product.brand_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
  text = text.replace(SIZE_RE, ' ').replace(REF_RE, ' ');
  // Remove índices de carga/velocidade, XL, RunFlat e termos genéricos da ficha.
  text = text.replace(/\b\d{2,3}\s*[A-Z]{1,2}\b/gi, ' ').replace(/\b(?:XL|Xl|RUNFLAT|RFT|TL|TT|M\+S|3PMSF)\b/gi, ' ');
  const words = norm(text).split(' ').filter((w) => w.length > 1 && !/^\d+$/.test(w));
  return words.join(' ').trim();
}

function getHeaders() {
  const h = { Accept: 'application/json', 'X-API-Key': process.env.TYRE_INFO_API_KEY.trim() };
  if (process.env.TYRE_INFO_ORIGIN?.trim()) h.Origin = process.env.TYRE_INFO_ORIGIN.trim();
  return h;
}

async function apiGet(route, params) {
  const url = new URL(`${BASE}${route}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const response = await fetch(url, { headers: getHeaders(), redirect: 'error', signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`tyre.info HTTP ${response.status} em ${route}`);
  return response.json();
}

function rowsOf(json) { return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []; }

function matchScore(query, candidate) {
  const q = new Set(norm(query).split(' ').filter(Boolean));
  const c = new Set(norm(`${candidate.model || ''} ${candidate.full_name || ''}`).split(' ').filter(Boolean));
  if (!q.size || !c.size) return 0;
  let hit = 0;
  for (const t of q) if (c.has(t)) hit++;
  return hit / q.size;
}

function productSize(p) {
  const s = typeof p.specs === 'string' ? (() => { try { return JSON.parse(p.specs); } catch { return {}; } })() : (p.specs || {});
  const w = String(s.width || '').replace(/\D/g, '');
  const h = String(s.height || '').replace(/\D/g, '');
  const r = String(s.diameter || '').replace(/\D/g, '');
  return w && h && r ? `${w}/${h}R${r}` : null;
}

async function main() {
  const options = args(process.argv.slice(2));
  if (options.help) {
    console.log('Busca avaliações externas de pneus e grava candidatos em .cache/product-review-candidates.json.\nUso: npm run fetch:product-reviews -- [--supplier=neumaticos_andres | --all-suppliers] [--limit=100] [--per-tyre=5] [--lang=fr]');
    return;
  }
  if (!process.env.TYRE_INFO_API_KEY?.trim()) throw new Error('Defina TYRE_INFO_API_KEY; a chave deve pertencer a um plano que autorize exibição pública.');

  const db = new Client({ connectionString: getDbUrl() });
  await db.connect();
  try {
    const params = [];
    const where = ["p.category ILIKE '%pneu%' OR p.pa_tipo ILIKE '%pneu%' OR p.specs ? 'width'"];
    if (!options.allSuppliers) { params.push(options.supplier); where.push(`p.external_supplier = $${params.length}`); }
    params.push(options.limit);
    const { rows: products } = await db.query(`
      SELECT p.id, p.ean, p.name, p.brand, p.specs, p.category, p.external_supplier, b.name AS brand_name
      FROM public.products p LEFT JOIN public.brands b ON b.id = p.brand_id
      WHERE (${where[0]}) AND ${where.slice(1).join(' AND ')}
      ORDER BY p.created_at LIMIT $${params.length}
    `, params);

    const results = [];
    for (const p of products) {
      const brand = String(p.brand_name || p.brand || '').trim();
      const query = modelQuery(p);
      const base = { productId: String(p.id), ean: p.ean || null, productName: p.name, brand, size: productSize(p) };
      if (!brand || query.split(' ').length < 1) {
        results.push({ ...base, status: 'skipped', reason: 'marca ou modelo insuficiente no catálogo', reviews: [] });
        continue;
      }
      try {
        const found = rowsOf(await apiGet('/tyres/search', {
          pattern: query, brand, limit: 10,
          fields: 'id,brand,model,full_name,review_count,avg_rating,url',
        }));
        const exactBrand = found.filter((t) => norm(t.brand) === norm(brand));
        const ranked = exactBrand.map((t) => ({ tyre: t, score: matchScore(query, t) })).filter((x) => x.score >= 0.8)
          .sort((a, b) => b.score - a.score);
        if (!ranked.length || (ranked.length > 1 && ranked[0].score === ranked[1].score)) {
          results.push({ ...base, status: 'unmatched', reason: ranked.length ? 'correspondência ambígua' : 'nenhum modelo com marca e nome suficientemente correspondentes', modelQuery: query, reviews: [] });
          continue;
        }
        const { tyre, score } = ranked[0];
        const reviewJson = await apiGet('/reviews', { tyre_ids: tyre.id, limit_per_tyre: options.perTyre, lang: options.lang });
        const reviews = rowsOf(reviewJson).filter((r) => String(r.tyre_id ?? r.tyre?.id ?? tyre.id) === String(tyre.id)).map((r) => ({
          reviewId: r.review_id ?? r.id ?? null,
          date: r.date ?? null,
          rating: r.rating ?? null,
          comment: r.comment ?? null,
          language: r.language ?? null,
          publicName: r.username ?? null,
          size: r.size ?? null,
          mileage: r.miles ?? null,
          sourceUrl: r.url || tyre.url || null,
          source: 'tyre.info / Tyre Reviews',
          attributionRequired: true,
          fitmentNote: base.size && r.size && norm(base.size) !== norm(r.size) ? 'medida da avaliação difere da ficha do produto; revisar e não associar automaticamente' : (!r.size ? 'medida não informada na avaliação; confirmar antes de associar à variante' : 'medida coincide'),
        })).filter((r) => r.comment && r.comment.trim());
        results.push({ ...base, status: reviews.length ? 'candidate' : 'no_reviews', modelQuery: query, matchedModel: tyre.full_name || tyre.model, matchScore: Number(score.toFixed(2)), sourceUrl: tyre.url || null, reviews });
      } catch (err) {
        results.push({ ...base, status: 'error', reason: err instanceof Error ? err.message : 'falha na consulta', reviews: [] });
      }
    }

    const output = {
      generatedAt: new Date().toISOString(),
      provider: 'tyre.info / Tyre Reviews',
      providerDocs: 'https://api.tyre.info/v1/docs/guide.html',
      notice: 'Avaliações externas de proprietários, não avaliações de compradores da MecaniDoc. Exibição pública requer plano/licença autorizados, atribuição e revisão editorial. Não importar automaticamente para Avis des clients.',
      supplierScope: options.allSuppliers ? 'all' : options.supplier,
      counts: Object.fromEntries(['candidate', 'unmatched', 'no_reviews', 'skipped', 'error'].map((status) => [status, results.filter((r) => r.status === status).length])),
      products: results,
    };
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`Produtos lidos: ${products.length}`);
    console.log(`Candidatos com comentários: ${output.counts.candidate} | sem correspondência: ${output.counts.unmatched} | sem avaliações: ${output.counts.no_reviews} | ignorados: ${output.counts.skipped} | erros: ${output.counts.error}`);
    console.log(`Arquivo: ${OUT}`);
  } finally { await db.end(); }
}

main().catch((err) => { console.error(`Erro: ${err instanceof Error ? err.message : err}`); process.exitCode = 1; });
