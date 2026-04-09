import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSupplierOrMasterUser } from '@/lib/admin-auth-server';
import { importProductsFromCsvText } from '@/lib/import-products-from-csv';

const DEFAULT_BUCKET = 'product-imports';
const MAX_CSV_BYTES = 15 * 1024 * 1024;

function sanitizePath(path: string): string | null {
  const p = path.trim().replace(/^\/+/, '');
  if (!p || p.includes('..') || p.includes('\\')) return null;
  return p;
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

  let body: { path?: string; bucket?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const bucket = (typeof body.bucket === 'string' && body.bucket.trim() ? body.bucket.trim() : DEFAULT_BUCKET);
  const objectPath = sanitizePath(typeof body.path === 'string' ? body.path : '');
  if (!objectPath) {
    return NextResponse.json(
      { error: 'Campo "path" obrigatorio (ex: imports/produtos.csv, sem ..)' },
      { status: 400 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const logs: string[] = [];
  logs.push(`A ler do Storage: ${bucket} / ${objectPath}`);

  const { data: blob, error: dlError } = await admin.storage.from(bucket).download(objectPath);

  if (dlError || !blob) {
    console.error('import-products-storage download:', dlError);
    return NextResponse.json(
      {
        ok: false,
        error:
          dlError?.message?.includes('not found') || dlError?.message?.includes('Bucket not found')
            ? `Bucket ou ficheiro inexistente. Crie o bucket "${DEFAULT_BUCKET}" (script SQL) e envie o CSV para esse caminho.`
            : dlError?.message || 'Falha ao descarregar do Storage',
        logs,
      },
      { status: dlError?.message?.includes('not found') ? 404 : 500 }
    );
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Ficheiro demasiado grande (max ${MAX_CSV_BYTES / (1024 * 1024)} MB)`, logs },
      { status: 400 }
    );
  }

  const csvText = buf.toString('utf-8');
  const result = await importProductsFromCsvText(csvText, admin, auth.user.id, logs);

  return NextResponse.json({
    ok: true,
    bucket,
    path: objectPath,
    ...result,
    logs,
  });
}
