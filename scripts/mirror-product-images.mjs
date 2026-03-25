#!/usr/bin/env node
/**
 * Espelha imagens externas (ex.: WordPress/Hostinger) para o Supabase Storage
 * e atualiza a coluna `products.images` com as novas URLs públicas.
 *
 * Pré-requisitos no Supabase:
 * 1. Criar um bucket (ex.: product-images) — Storage → New bucket.
 * 2. Tornar o bucket público OU usar URLs assinadas (este script usa getPublicUrl).
 * 3. Políticas RLS do Storage: permitir INSERT com service_role (a service key ignora RLS,
 *    mas buckets novos às vezes precisam de policy para leitura pública).
 *
 * Variáveis de ambiente (.env.local ou .env na raiz do projeto):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — chave com privilégios elevados:
 *     • JWT legacy "service_role" (começa por eyJ…), OU
 *     • chave nova "sb_secret_…" — nesse caso também precisa de NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT anon)
 *       no mesmo projeto (o script usa apikey=secret + Bearer=anon, padrão da plataforma).
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — obrigatória se usar sb_secret_…
 *
 * Opcional:
 *   MIRROR_IMAGES_BUCKET=product-images
 *
 * Uso:
 *   node scripts/mirror-product-images.mjs              # executa
 *   node scripts/mirror-product-images.mjs --dry-run    # só mostra o que faria
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/**
 * Mesma ideia que o Next: .env.local sobrescreve .env.
 * (Antes: .env.local era lido primeiro e .env não podia corrigir chaves erradas em .env.local.)
 */
function loadEnvFiles() {
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnvFiles();

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = (process.env.MIRROR_IMAGES_BUCKET || 'product-images').trim();

function normalizeEnvValue(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Remove BOM, zero-width chars e quebras — chaves JWT copiadas em várias linhas falhavam o check eyJ. */
function normalizeServiceKey(raw) {
  let s = normalizeEnvValue(raw);
  if (!s) return '';
  s = s.replace(/^\uFEFF/, '');
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  s = s.replace(/\s/g, '');
  return s;
}

const SUPABASE_URL = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
let SERVICE_KEY = normalizeServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const ANON_KEY = normalizeServiceKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const keyFile = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY_FILE);
if (!SERVICE_KEY && keyFile && existsSync(keyFile)) {
  SERVICE_KEY = normalizeServiceKey(readFileSync(keyFile, 'utf8'));
}

/** Extrai o campo `ref` do payload de um JWT Supabase (sem validar assinatura). */
function jwtPayloadRef(jwt) {
  if (!jwt || typeof jwt !== 'string' || !jwt.includes('.')) return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return typeof json.ref === 'string' ? json.ref : null;
  } catch {
    return null;
  }
}

/** Ref do projeto a partir de https://REF.supabase.co */
function supabaseRefFromUrl(urlString) {
  try {
    const host = new URL(urlString.trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function printKeyHelp() {
  console.error(`
401 / "Invalid API key" — o Supabase não aceitou a combinação URL + chaves.

1) Confirme que NEXT_PUBLIC_SUPABASE_URL é o URL deste projeto (Settings → API).

2) Escolha UMA destas formas (a mais simples para scripts costuma ser A):

   A) Legacy API keys (JWT longo)
      Dashboard → Settings → API → separador "Legacy API keys"
      Copie "service_role" (secret) para:
        SUPABASE_SERVICE_ROLE_KEY=eyJ...

   B) Chave nova sb_secret_…
      Copie a secret key para SUPABASE_SERVICE_ROLE_KEY e no MESMO .env.local defina também
      a chave anon (JWT) do mesmo projeto:
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
      (O script usa apikey=sb_secret + Authorization: Bearer anon.)

3) Não use sb_publishable_… em SUPABASE_SERVICE_ROLE_KEY (é chave pública).

4) Opcional: ficheiro só com a secret
     SUPABASE_SERVICE_ROLE_KEY_FILE=C:\\caminho\\service_role.txt

5) O JWT service_role contém um campo "ref" (nome do projeto). Tem de ser IGUAL ao
   subdomínio do NEXT_PUBLIC_SUPABASE_URL (ex.: URL …/ihfnjelbqspgawjjnoqc.supabase.co
   → ref tem de ser ihfnjelbqspgawjjnoqc). Se for outro ref, terá sempre 401.
`);
}

/** Estratégias REST alinhadas a JWT legacy vs chaves opacas (sb_secret_). */
async function findWorkingRestStrategy(baseUrl, serviceKey, anonKey) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/products?select=id&limit=1`;
  const strategies = [];
  if (
    serviceKey.startsWith('sb_secret_') &&
    anonKey &&
    /^eyJ/.test(anonKey) &&
    serviceKey !== anonKey
  ) {
    strategies.push({
      id: 'opaque_secret_bearer_anon',
      label: 'apikey = sb_secret + Bearer = anon JWT',
      headers: { apikey: serviceKey, Authorization: `Bearer ${anonKey}` },
    });
  }
  strategies.push({
    id: 'legacy_jwt',
    label: 'apikey + Bearer = service (JWT legacy)',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  strategies.push({
    id: 'apikey_only',
    label: 'só header apikey',
    headers: { apikey: serviceKey },
  });

  let lastStatus = 0;
  let lastHint = '';
  for (const s of strategies) {
    const res = await fetch(url, { headers: s.headers });
    lastStatus = res.status;
    if (res.ok) return { ok: true, strategy: s.id, label: s.label };
    lastHint = await res.text().catch(() => '');
  }
  return {
    ok: false,
    status: lastStatus,
    hint: lastHint.slice(0, 240),
  };
}

function createSupabaseClient(strategyId) {
  const common = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  if (strategyId === 'opaque_secret_bearer_anon' && ANON_KEY) {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
      ...common,
      global: {
        fetch: async (input, init) => {
          const h = new Headers(init?.headers);
          h.set('apikey', SERVICE_KEY);
          h.set('Authorization', `Bearer ${ANON_KEY}`);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
  }

  if (strategyId === 'apikey_only') {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
      ...common,
      global: {
        fetch: async (input, init) => {
          const h = new Headers(init?.headers);
          h.set('apikey', SERVICE_KEY);
          h.delete('Authorization');
          return fetch(input, { ...init, headers: h });
        },
      },
    });
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, common);
}

/** URLs já migradas (mesmo host do projeto Supabase) — não reprocessar */
function isAlreadyOurStorage(url, projectHost) {
  try {
    const h = new URL(url).hostname;
    return h === projectHost || h.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function fileNameFromUrl(urlString, fallbackIndex) {
  try {
    const u = new URL(urlString);
    let base = path.basename(u.pathname) || `image_${fallbackIndex}`;
    base = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!base || base === '_') base = `image_${fallbackIndex}.bin`;
    return base.slice(0, 200);
  } catch {
    return `image_${fallbackIndex}.bin`;
  }
}

function guessContentType(fileName, buffer) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (buffer?.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  return 'application/octet-stream';
}

async function downloadImage(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'MecaniDocImageMirror/1.0',
      Accept: 'image/*,*/*',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error('resposta vazia');
  return { buffer: buf, contentType: res.headers.get('content-type') };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.example).'
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  if (SERVICE_KEY.startsWith('sb_publishable_')) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY parece uma chave PUBLICÁVEL (sb_publishable_). Use sb_secret_ ou o JWT service_role (legacy).'
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  if (SERVICE_KEY.startsWith('sb_secret_') && !ANON_KEY) {
    console.error(
      'Com chave sb_secret_… é necessário NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT anon do mesmo projeto) no .env.local.\n' +
        'Alternativa: use o JWT "service_role" do separador Legacy API keys só em SUPABASE_SERVICE_ROLE_KEY.'
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  if (!/^https:\/\//i.test(SUPABASE_URL)) {
    console.warn('Aviso: NEXT_PUBLIC_SUPABASE_URL devia ser HTTPS (ex.: https://xxxx.supabase.co).');
  }

  if (ANON_KEY && SERVICE_KEY === ANON_KEY) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY é igual à NEXT_PUBLIC_SUPABASE_ANON_KEY. Use a chave service_role do dashboard.'
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  const urlRef = supabaseRefFromUrl(SUPABASE_URL);
  const serviceRef = SERVICE_KEY.includes('.') ? jwtPayloadRef(SERVICE_KEY) : null;
  const anonRef = ANON_KEY.includes('.') ? jwtPayloadRef(ANON_KEY) : null;

  if (urlRef && anonRef && anonRef !== urlRef) {
    console.error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY é do projeto "${anonRef}" mas o URL é "${urlRef}.supabase.co". Alinhe URL e chaves ao mesmo projeto.`
    );
    process.exitCode = 1;
    return;
  }

  if (urlRef && serviceRef && serviceRef !== urlRef) {
    console.error(
      `SUPABASE_SERVICE_ROLE_KEY (JWT) é do projeto "${serviceRef}" mas NEXT_PUBLIC_SUPABASE_URL é "${urlRef}.supabase.co".\n` +
        `São projetos diferentes → 401 Invalid API key.\n` +
        `Abra o Dashboard do projeto "${urlRef}", Settings → API → Legacy → service_role, e copie essa chave.`
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  const probe = await findWorkingRestStrategy(SUPABASE_URL, SERVICE_KEY, ANON_KEY);
  if (!probe.ok) {
    console.error(
      'Nenhuma estratégia REST funcionou. Último HTTP:',
      probe.status,
      probe.hint || ''
    );
    printKeyHelp();
    process.exitCode = 1;
    return;
  }

  console.log(`Auth REST: ${probe.label || probe.strategy}`);

  const supabase = createSupabaseClient(probe.strategy);

  const projectHost = new URL(SUPABASE_URL).hostname;

  console.log(`Bucket: ${BUCKET}`);
  console.log(`Dry-run: ${DRY_RUN}`);

  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('id, images')
    .not('images', 'is', null);

  if (fetchErr) {
    console.error('Erro ao listar produtos:', fetchErr.message);
    if (/invalid api key/i.test(fetchErr.message)) printKeyHelp();
    process.exitCode = 1;
    return;
  }

  /** @type {Map<string, string>} url remota → URL pública no Storage */
  const urlCache = new Map();
  let updatedProducts = 0;
  let skippedProducts = 0;
  let errors = 0;

  for (const row of products || []) {
    let images = row.images;
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch {
        skippedProducts++;
        console.warn(`[skip] ${row.id}: images não é JSON/array válido`);
        continue;
      }
    }
    if (!Array.isArray(images) || images.length === 0) {
      skippedProducts++;
      continue;
    }

    const newUrls = [];
    let changed = false;

    for (let i = 0; i < images.length; i++) {
      const raw = images[i];
      const url = typeof raw === 'string' ? raw.trim() : '';
      if (!url || !/^https?:\/\//i.test(url)) {
        newUrls.push(raw);
        continue;
      }

      if (isAlreadyOurStorage(url, projectHost)) {
        newUrls.push(url);
        continue;
      }

      if (urlCache.has(url)) {
        const cached = urlCache.get(url);
        if (cached !== url) changed = true;
        newUrls.push(cached);
        continue;
      }

      try {
        if (DRY_RUN) {
          console.log(`[dry-run] ${row.id}: baixaria ${url}`);
          newUrls.push(url);
          continue;
        }

        const { buffer, contentType: ctHeader } = await downloadImage(url);
        const baseName = fileNameFromUrl(url, i);
        const contentType =
          ctHeader?.split(';')[0]?.trim() || guessContentType(baseName, buffer);
        const objectPath = `${row.id}/${Date.now()}_${i}_${baseName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, buffer, {
            contentType,
            upsert: true,
          });

        if (upErr) {
          throw new Error(upErr.message);
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
        const publicUrl = pub.publicUrl;
        urlCache.set(url, publicUrl);
        newUrls.push(publicUrl);
        changed = true;
        console.log(`OK ${row.id}: ${url.slice(0, 60)}… → ${publicUrl}`);
      } catch (e) {
        errors++;
        console.error(`ERRO ${row.id} imagem ${i}: ${url}`, e.message || e);
        newUrls.push(url);
      }
    }

    if (!changed || DRY_RUN) continue;

    const { error: upProdErr } = await supabase
      .from('products')
      .update({ images: newUrls })
      .eq('id', row.id);

    if (upProdErr) {
      errors++;
      console.error(`Erro ao atualizar produto ${row.id}:`, upProdErr.message);
    } else {
      updatedProducts++;
    }
  }

  console.log('---');
  console.log(`Produtos atualizados: ${updatedProducts}`);
  console.log(`Ignorados: ${skippedProducts}`);
  console.log(`Erros (download/upload/update): ${errors}`);
  if (DRY_RUN) {
    console.log('Execute sem --dry-run após criar o bucket e políticas.');
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
