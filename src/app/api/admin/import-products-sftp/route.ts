import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import SftpClient from 'ssh2-sftp-client';
import { requireSupplierOrMasterUser } from '@/lib/admin-auth-server';
import { importProductsFromCsvText } from '@/lib/import-products-from-csv';

export async function POST(_request: NextRequest) {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sftpHost = process.env.SFTP_HOST;
  const sftpPort = Number.parseInt(process.env.SFTP_PORT || '22', 10);
  const sftpUser = process.env.SFTP_USER;
  const sftpPassword = process.env.SFTP_PASSWORD;
  const sftpPrivateKey = process.env.SFTP_PRIVATE_KEY;
  const sftpProductsPath = process.env.SFTP_PRODUCTS_PATH;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Configuracao ausente: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  if (!sftpHost || !sftpUser || !sftpProductsPath) {
    return NextResponse.json(
      { error: 'Configuracao SFTP ausente: SFTP_HOST, SFTP_USER e SFTP_PRODUCTS_PATH.' },
      { status: 400 }
    );
  }

  if (!sftpPassword && !sftpPrivateKey) {
    return NextResponse.json(
      { error: 'Defina SFTP_PASSWORD ou SFTP_PRIVATE_KEY para autenticar no SFTP.' },
      { status: 400 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const logs: string[] = [];
  const sftp = new SftpClient();

  try {
    logs.push(`Conectando ao SFTP ${sftpHost}:${sftpPort}...`);

    await sftp.connect({
      host: sftpHost,
      port: sftpPort,
      username: sftpUser,
      password: sftpPassword || undefined,
      privateKey: sftpPrivateKey || undefined,
      readyTimeout: 20000,
    });

    logs.push(`Baixando arquivo CSV: ${sftpProductsPath}`);
    const raw = await sftp.get(sftpProductsPath);
    const csvText = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw);

    const result = await importProductsFromCsvText(csvText, admin, auth.user.id, logs);

    return NextResponse.json({
      ok: true,
      ...result,
      logs,
    });
  } catch (error: unknown) {
    console.error('SFTP import error:', error);
    const msg = error instanceof Error ? error.message : 'Falha na importacao SFTP';
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        logs,
      },
      { status: 500 }
    );
  } finally {
    try {
      await sftp.end();
    } catch {
      // ignore
    }
  }
}
