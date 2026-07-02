import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
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

  let body: { path?: string; bucket?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const bucket = typeof body.bucket === 'string' && body.bucket.trim() ? body.bucket.trim() : DEFAULT_BUCKET;
  const objectPath = sanitizePath(typeof body.path === 'string' ? body.path : '');
  if (!objectPath) {
    return NextResponse.json(
      { error: 'Campo "path" obrigatorio (ex: imports/produtos.csv, sem ..)' },
      { status: 400 }
    );
  }

  const admin = createAdminDbClient();
  const logs: string[] = [];
  logs.push(`A ler ficheiro local: ${bucket} / ${objectPath}`);

  const { data: buf, error: dlError } = await admin.storage.from(bucket).download(objectPath);

  if (dlError || !buf) {
    return NextResponse.json(
      {
        ok: false,
        error: dlError?.message || `Ficheiro nao encontrado em uploads/${bucket}/${objectPath}`,
        logs,
      },
      { status: 404 }
    );
  }

  if (buf.length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Ficheiro demasiado grande (max ${MAX_CSV_BYTES / (1024 * 1024)} MB)`, logs },
      { status: 400 }
    );
  }

  const csvText = buf.toString('utf-8');
  const result = await importProductsFromCsvText(csvText, admin, auth.user.id, logs);

  return NextResponse.json({ ok: true, bucket, path: objectPath, ...result, logs });
}
