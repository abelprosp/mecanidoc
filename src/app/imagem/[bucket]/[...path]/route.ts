import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_IMAGE_BUCKETS } from '@/lib/site-image-url';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bucket: string; path: string[] }> }
) {
  const { bucket, path: pathParts } = await context.params;

  if (!PUBLIC_IMAGE_BUCKETS.has(bucket)) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!pathParts?.length) {
    return new NextResponse('Not found', { status: 404 });
  }
  for (const p of pathParts) {
    if (p === '..' || p === '.' || !p.length) {
      return new NextResponse('Not found', { status: 404 });
    }
  }

  const objectPath = pathParts.join('/');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new NextResponse('Server misconfigured', { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.storage.from(bucket).download(objectPath);

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 });
  }

  const mime =
    data.type && data.type !== 'application/octet-stream'
      ? data.type
      : 'application/octet-stream';

  const ab = await data.arrayBuffer();

  return new NextResponse(ab, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
