import 'server-only';

import { assertPublicUrl, fetchPublicUrl } from '@/lib/safe-fetch';

/** Valida (incluindo resolução DNS) que a URL aponta para um host público. */
export async function assertFetchablePublicHttpsUrl(urlString: string): Promise<URL> {
  return assertPublicUrl(urlString);
}

export async function fetchRemoteImageWithLimit(
  initialUrl: string,
  maxBytes: number,
  allowedMime: Set<string>
): Promise<{ buffer: Buffer; mime: string }> {
  const { buffer, mime } = await fetchPublicUrl(initialUrl, {
    maxBytes,
    allowedMime,
    accept: 'image/*',
    userAgent: 'MecanidocImageIngest/1.0',
    timeoutMs: 25_000,
  });
  return { buffer, mime };
}
