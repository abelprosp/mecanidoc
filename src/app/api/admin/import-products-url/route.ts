import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSupplierOrMasterUser } from '@/lib/admin-auth-server';
import { importProductsFromCsvText } from '@/lib/import-products-from-csv';

const MAX_CSV_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 45_000;

function assertImportUrlAllowed(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('URL invalida');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Apenas URLs http ou https');
  }
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) throw new Error('Host nao permitido');
  if (h === '169.254.169.254' || h === 'metadata.google.internal') throw new Error('Host nao permitido');

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const p = m.slice(1, 5).map((x) => Number.parseInt(x, 10));
    const [a, b] = p;
    if (a === 10) throw new Error('IP privado nao permitido');
    if (a === 172 && b >= 16 && b <= 31) throw new Error('IP privado nao permitido');
    if (a === 192 && b === 168) throw new Error('IP privado nao permitido');
    if (a === 127) throw new Error('IP privado nao permitido');
    if (a === 0) throw new Error('IP nao permitido');
  }
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd')) {
    throw new Error('IPv6 privado nao permitido');
  }
  return u;
}

export async function POST(request: NextRequest) {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Configuracao ausente: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const rawUrl = typeof body.url === 'string' ? body.url : '';
  if (!rawUrl.trim()) {
    return NextResponse.json({ error: 'Campo "url" obrigatorio' }, { status: 400 });
  }

  let safeUrl: URL;
  try {
    safeUrl = assertImportUrlAllowed(rawUrl);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'URL invalida';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const logs: string[] = [];
  logs.push(`A descarregar CSV: ${safeUrl.origin}${safeUrl.pathname}`);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/csv,text/plain,*/*',
        'User-Agent': 'MecaniDoc-ProductImport/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `HTTP ${res.status} ao obter o ficheiro`, logs },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_CSV_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Ficheiro demasiado grande (max ${MAX_CSV_BYTES / (1024 * 1024)} MB)`, logs },
        { status: 400 }
      );
    }

    const csvText = buf.toString('utf-8');
    const admin = createClient(supabaseUrl, serviceKey);

    const result = await importProductsFromCsvText(csvText, admin, auth.user.id, logs);

    return NextResponse.json({
      ok: true,
      ...result,
      logs,
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.name === 'AbortError'
        ? 'Timeout ao descarregar a URL'
        : e instanceof Error
          ? e.message
          : 'Falha ao descarregar';
    console.error('import-products-url:', e);
    return NextResponse.json({ ok: false, error: msg, logs }, { status: 500 });
  } finally {
    clearTimeout(t);
  }
}
