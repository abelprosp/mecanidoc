import type { GtinEnrichPatch, GtinProductDetail } from './types';
import { parseTireSpecsFromText } from './tire-size-parse';

export function mapGtinToProductPatch(detail: GtinProductDetail): GtinEnrichPatch {
  const name = detail.name?.trim();
  const brand = detail.brand?.trim();
  const description = detail.description?.trim();
  const category = detail.category?.trim();

  const parsedSize = parseTireSpecsFromText(name || description || '');
  const specs: Record<string, unknown> = { ...(detail.specs || {}) };

  if (parsedSize.width && !specs.width) specs.width = parsedSize.width;
  if (parsedSize.height && !specs.height) specs.height = parsedSize.height;
  if (parsedSize.diameter && !specs.diameter) specs.diameter = parsedSize.diameter;
  if (parsedSize.load_index && !specs.load_index) specs.load_index = parsedSize.load_index;
  if (parsedSize.speed_index && !specs.speed_index) specs.speed_index = parsedSize.speed_index;

  const images = detail.imageUrl ? [detail.imageUrl] : undefined;

  return {
    name: name || undefined,
    brand: brand || undefined,
    description: description || undefined,
    category: category || undefined,
    images,
    specs: Object.keys(specs).length ? specs : undefined,
    labels: detail.labels && Object.keys(detail.labels).length ? detail.labels : undefined,
    gtinMetadata: {
      gtin: detail.gtin,
      source: detail.source,
      enrichedAt: new Date().toISOString(),
    },
  };
}
