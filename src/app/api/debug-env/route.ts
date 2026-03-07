import { NextResponse } from 'next/server';

/**
 * Só para desenvolvimento: mostra qual Supabase URL está a ser usada.
 * Acede a http://localhost:3000/api/debug-env para verificar.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(não definido)';
  const isNew = url.includes('ihfnjelbqspgawjjnoqc');
  const isOld = url.includes('yjdoprfjgaeyvvyhpihd');
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url,
    projeto: isNew ? 'ihfnjelbqspgawjjnoqc (novo)' : isOld ? 'yjdoprfjgaeyvvyhpihd (antigo)' : 'outro',
    dica: isOld ? 'Ainda está o antigo. Apaga a pasta .next, confirma que não tens .env.local com o antigo, e reinicia npm run dev.' : null,
  });
}
