import { NextRequest, NextResponse } from 'next/server';
import { fetchEprelLabelPng, fetchEprelProductByGtin } from '@/lib/eprel/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const registrationNumber = searchParams.get('registrationNumber')?.trim();
  const ean = searchParams.get('ean')?.replace(/\D/g, '') || '';
  const productGroup = searchParams.get('productGroup')?.trim() || 'tyres';

  let reg = registrationNumber || null;

  if (!reg && ean.length >= 8) {
    const detail = await fetchEprelProductByGtin(ean);
    reg = detail?.registrationNumber || (detail as { eprelRegistrationNumber?: string })?.eprelRegistrationNumber || null;
  }

  if (!reg) {
    return NextResponse.json({ error: 'Etiqueta EPREL não encontrada' }, { status: 404 });
  }

  const label = await fetchEprelLabelPng(reg, productGroup);
  if (!label) {
    return NextResponse.json({ error: 'PNG EPREL indisponível' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(label.buffer), {
    status: 200,
    headers: {
      'Content-Type': label.contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
