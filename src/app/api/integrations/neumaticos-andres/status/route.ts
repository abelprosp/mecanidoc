import { NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { resolveNeumaticosAndresConfig } from '@/lib/neumaticos-andres/credentials';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = await resolveNeumaticosAndresConfig();
  const checks: Record<string, boolean | string | number> = {
    credentials: config.isConfigured,
    baseUrl: config.baseUrl,
    testMode: config.testMode,
  };

  try {
    const admin = getSupabaseAdmin();

    const { error: settingsError } = await admin
      .from('global_settings')
      .select('na_integration_enabled')
      .limit(1);

    checks.databaseMigration = !settingsError;
    if (settingsError) checks.migrationError = settingsError.message;

    const { count, error: productsError } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('external_supplier', 'neumaticos_andres');

    checks.productsLinked = !productsError;
    checks.linkedProductCount = productsError ? 0 : count || 0;

    const { count: eanCount } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('ean', 'is', null);

    checks.productsWithEan = eanCount || 0;
  } catch (error: unknown) {
    checks.databaseError = error instanceof Error ? error.message : 'Erro base de dados';
  }

  const ready =
    Boolean(checks.credentials) &&
    Boolean(checks.databaseMigration) &&
    Number(checks.linkedProductCount) > 0;

  return NextResponse.json({
    ok: ready,
    checks,
    nextSteps: getNextSteps(checks),
  });
}

function getNextSteps(checks: Record<string, boolean | string | number>): string[] {
  const steps: string[] = [];

  if (!checks.credentials) {
    steps.push(
      'Configure login/password no painel (secção Ligar API) ou defina NEUMATICOS_ANDRES_* no .env.'
    );
  }
  if (!checks.databaseMigration) {
    steps.push('Execute create_neumaticos_andres_integration.sql e create_supplier_api.sql no PostgreSQL.');
  }
  if (Number(checks.linkedProductCount) === 0) {
    steps.push(
      'Use "Puxar pneus da API" para importar o catálogo europeu, ou marque produtos com external_supplier = neumaticos_andres.'
    );
  }
  if (steps.length === 0) {
    steps.push('Ative a integração no admin e clique em "Sync stock & prix".');
  }

  return steps;
}
