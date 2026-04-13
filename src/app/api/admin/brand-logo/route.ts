import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
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

  const admin = createClient(supabaseUrl, serviceKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (uploadError) {
    console.error('brand-logo upload:', uploadError);
    return NextResponse.json(
      {
        error:
          uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')
            ? 'Bucket « brand-logos » introuvable. Exécutez supabase_storage_brand_logos.sql dans le SQL Editor.'
            : uploadError.message || 'Échec du téléversement',
      },
      { status: 500 }
    );
  }

  const url = buildAbsoluteSiteImageUrl(request, BUCKET, path);
  return NextResponse.json({ url });
}
