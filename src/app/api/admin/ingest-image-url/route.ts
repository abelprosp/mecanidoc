import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  ALLOWED_IMAGE_MIMES,
  extFromMime,
  MAX_BRAND_LOGO_BYTES,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_SUBCATEGORY_HERO_BYTES,
} from '@/lib/admin-image-upload';
import { fetchRemoteImageWithLimit } from '@/lib/remote-image-fetch';
import { buildAbsoluteSiteImageUrl, tryParseSupabaseStoragePublicUrl } from '@/lib/site-image-url';

type Body = {
  url?: string;
  kind?: 'product' | 'brand' | 'subcategory';
  productId?: string | null;
  brandId?: string | null;
  subcategorySlug?: string | null;
};

function sanitizeBrandId(raw: string | null | undefined): string {
  if (!raw || raw === 'new' || raw === 'pending') return 'pending';
  if (!/^[a-f0-9-]{36}$/i.test(raw)) return 'pending';
  return raw;
}

function sanitizeProductId(raw: string | null | undefined): string | null {
  if (!raw || raw === 'pending') return null;
  if (!/^[a-f0-9-]{36}$/i.test(raw)) return null;
  return raw;
}

function sanitizeSubcategorySlug(raw: string | null | undefined): string {
  const t = (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return t || 'pending';
}

function alreadySiteImagemPath(raw: string): boolean {
  const t = raw.trim();
  if (t.startsWith('/imagem/')) return true;
  try {
    const u = new URL(t);
    if (u.pathname.startsWith('/imagem/')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'master') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Configuration serveur : SUPABASE_SERVICE_ROLE_KEY ou URL manquant.' },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  if (alreadySiteImagemPath(url)) {
    return NextResponse.json({ url });
  }

  const parsedOwn = tryParseSupabaseStoragePublicUrl(url);
  if (parsedOwn) {
    const absolute = buildAbsoluteSiteImageUrl(request, parsedOwn.bucket, parsedOwn.objectPath);
    return NextResponse.json({ url: absolute });
  }

  const kindRaw = body.kind;
  const kind: 'product' | 'brand' | 'subcategory' =
    kindRaw === 'brand' ? 'brand' : kindRaw === 'subcategory' ? 'subcategory' : 'product';

  let maxBytes: number;
  let bucket: string;
  let storageFolder: string;

  if (kind === 'subcategory') {
    maxBytes = MAX_SUBCATEGORY_HERO_BYTES;
    bucket = 'subcategory-heroes';
    storageFolder = sanitizeSubcategorySlug(body.subcategorySlug);
  } else if (kind === 'brand') {
    maxBytes = MAX_BRAND_LOGO_BYTES;
    bucket = 'brand-logos';
    storageFolder = sanitizeBrandId(body.brandId ?? null);
  } else {
    maxBytes = MAX_PRODUCT_IMAGE_BYTES;
    bucket = 'product-images';
    const productId = sanitizeProductId(body.productId);
    if (!productId) {
      return NextResponse.json({ error: 'Identifiant produit invalide' }, { status: 400 });
    }
    storageFolder = productId;
  }

  let buffer: Buffer;
  let mime: string;
  try {
    const got = await fetchRemoteImageWithLimit(url, maxBytes, ALLOWED_IMAGE_MIMES);
    buffer = got.buffer;
    mime = got.mime;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Échec du téléchargement';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const ext = extFromMime(mime);
  const path = `${storageFolder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  const admin = createClient(supabaseUrl, serviceKey);
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (uploadError) {
    console.error('ingest-image-url upload:', uploadError);
    return NextResponse.json(
      {
        error:
          uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')
            ? `Bucket « ${bucket} » introuvable. Exécutez le SQL storage correspondant.`
            : uploadError.message || 'Échec du téléversement',
      },
      { status: 500 }
    );
  }

  const absolute = buildAbsoluteSiteImageUrl(request, bucket, path);
  return NextResponse.json({ url: absolute });
}
