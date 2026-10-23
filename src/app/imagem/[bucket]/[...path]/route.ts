import { NextResponse } from 'next/server';
import path from 'node:path';
import { storageDownload } from '@/lib/storage/local';
import { PUBLIC_IMAGE_BUCKETS } from '@/lib/site-image-url';

export async function GET(
  _request: Request,
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
  const { data, error } = await storageDownload(bucket, objectPath);

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 });
  }

  const mimeByExtension: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  const contentType = mimeByExtension[path.extname(objectPath).toLowerCase()] || 'application/octet-stream';

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
