import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminDbClient } from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { ALLOWED_IMAGE_MIMES, extFromMime, MAX_BRAND_LOGO_BYTES } from '@/lib/admin-image-upload';
import { buildAbsoluteSiteImageUrl } from '@/lib/site-image-url';

const BUCKET = 'brand-logos';

function sanitizeBrandId(raw: string | null): string {
  if (!raw || raw === 'new' || raw === 'pending') return 'pending';
  if (!/^[a-f0-9-]{36}$/i.test(raw)) return 'pending';
  return raw;
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
  if ((profile as { role?: string } | null)?.role !== 'master') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }

  if (file.size > MAX_BRAND_LOGO_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    return NextResponse.json(
      { error: 'Type non autorisé (JPEG, PNG, WebP, GIF, SVG)' },
      { status: 400 }
    );
  }

  const brandId = sanitizeBrandId(formData.get('brandId') as string | null);
  const ext = extFromMime(mime);
  const path = `${brandId}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  const admin = createAdminDbClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: mime });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || 'Échec du téléversement' }, { status: 500 });
  }

  const url = buildAbsoluteSiteImageUrl(request, BUCKET, path);
  return NextResponse.json({ url });
}
