import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { requireSupplierOrMasterUser } from '@/lib/admin-auth-server';
import { importProductsFromCsvText } from '@/lib/import-products-from-csv';
import { fetchPublicUrl, SafeFetchError } from '@/lib/safe-fetch';

const MAX_CSV_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 45_000;
const ALLOWED_MIME = new Set([
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

export async function POST(request: NextRequest) {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) {
    return NextResponse.json({ error: 'Champ "url" obligatoire' }, { status: 400 });
  }

  const logs: string[] = [];

  try {
    // Redirects revalidados a cada salto (hostname + DNS), tamanho limitado em streaming.
    const { buffer, finalUrl } = await fetchPublicUrl(rawUrl, {
      maxBytes: MAX_CSV_BYTES,
      allowedMime: ALLOWED_MIME,
      accept: 'text/csv,text/plain,*/*',
      userAgent: 'MecaniDoc-ProductImport/1.0',
      timeoutMs: FETCH_TIMEOUT_MS,
    });
    const shown = new URL(finalUrl);
    logs.push(`CSV téléchargé : ${shown.origin}${shown.pathname} (${(buffer.length / 1024).toFixed(0)} Ko)`);

    const csvText = buffer.toString('utf-8');
    const admin = createAdminDbClient();
    const result = await importProductsFromCsvText(csvText, admin, auth.user.id, logs);

    return NextResponse.json({ ok: true, ...result, logs });
  } catch (e: unknown) {
    if (e instanceof SafeFetchError) {
      return NextResponse.json({ ok: false, error: e.message, logs }, { status: e.status });
    }
    const msg =
      e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')
        ? 'Délai dépassé lors du téléchargement'
        : 'Échec du téléchargement ou de l’import';
    console.error('import-products-url:', e);
    return NextResponse.json({ ok: false, error: msg, logs }, { status: 500 });
  }
}
