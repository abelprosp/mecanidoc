import type { GtinProductDetail } from './types';
import { classifyByEanPrefix, formatTireName } from '@/lib/neumaticos-andres/category-rules';

export function lookupEanHeuristics(gtin: string, naRef?: string | null): GtinProductDetail | null {
  const ean = gtin.replace(/\D/g, '');
  if (ean.length < 8) return null;

  const rule = classifyByEanPrefix(ean);
  if (!rule) return null;

  const brand = rule.brand ?? undefined;
  return {
    gtin: ean,
    name: formatTireName({ brand, ean, naRef: naRef ?? undefined }),
    brand,
    description: brand
      ? `Pneu ${brand}. EAN ${ean}${naRef ? ` — réf. Andrés ${naRef}` : ''}.`
      : `EAN ${ean}${naRef ? ` — réf. Andrés ${naRef}` : ''}.`,
    category: rule.category,
    specs: {
      vehicle_type: rule.category,
    },
    source: 'ean_heuristics',
  };
}
