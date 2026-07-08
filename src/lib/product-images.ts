/** Utilitários para separar foto do pneu vs etiqueta EPREL. */

export function isEprelLabelImage(url: unknown): boolean {
  const s = String(url || '');
  if (!s) return false;
  return /-eprel\.png/i.test(s) || /eprel\.ec\.europa\.eu/i.test(s) || /\/labels\?/i.test(s);
}

export function normalizeImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images.map(String).filter(Boolean);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [images];
    } catch {
      return [images];
    }
  }
  return [];
}

export function parseLabels(labels: unknown): Record<string, unknown> {
  if (!labels) return {};
  if (typeof labels === 'string') {
    try {
      return JSON.parse(labels) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof labels === 'object') return labels as Record<string, unknown>;
  return {};
}

export function parseExternalMetadata(meta: unknown): Record<string, unknown> {
  if (!meta) return {};
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof meta === 'object') return meta as Record<string, unknown>;
  return {};
}

export function getEprelRegistration(product: {
  external_metadata?: unknown;
  ean?: string | null;
}): string | null {
  const meta = parseExternalMetadata(product.external_metadata);
  const fromEnrich = (meta.eprel_enrich as { registrationNumber?: string } | undefined)?.registrationNumber;
  const fromCatalog = (meta.catalog_enrich as { registrationNumber?: string } | undefined)?.registrationNumber;
  const fromGtin = (meta.gtin_enrich as { eprelRegistrationNumber?: string } | undefined)?.eprelRegistrationNumber;
  return fromEnrich || fromCatalog || fromGtin || null;
}

export function resolveProductMedia(product: {
  images?: unknown;
  labels?: unknown;
  external_metadata?: unknown;
}) {
  const images = normalizeImages(product.images);
  const labels = parseLabels(product.labels);
  const labelUrl = typeof labels.label_url === 'string' ? labels.label_url : null;

  const eprelFromImages = images.find((url) => isEprelLabelImage(url)) || null;
  const tireImage = images.find((url) => !isEprelLabelImage(url)) || null;

  const eprelLabelImage = eprelFromImages || (labelUrl && isEprelLabelImage(labelUrl) ? labelUrl : labelUrl) || null;
  const registrationNumber = getEprelRegistration(product);

  return {
    tireImage,
    eprelLabelImage,
    registrationNumber,
    hasLocalEprelLabel: Boolean(eprelFromImages || (labelUrl && !labelUrl.includes('eprel.ec.europa.eu'))),
  };
}

export function buildEprelLabelApiUrl(product: {
  ean?: string | null;
  external_metadata?: unknown;
}): string | null {
  const reg = getEprelRegistration(product);
  const ean = String(product.ean || '').replace(/\D/g, '');
  if (reg) return `/api/eprel/label?registrationNumber=${encodeURIComponent(reg)}`;
  if (ean.length >= 8) return `/api/eprel/label?ean=${encodeURIComponent(ean)}`;
  return null;
}
