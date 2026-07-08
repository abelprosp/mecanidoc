/**
 * Resolve nome real de um pneu NA:
 *   1. getstock (ref NA) → EAN confirmado
 *   2. GTINHub → UPC → EPREL
 */
import { fetchNaStockArticle } from './na-stock-client.mjs';
import { fetchFullEnrichmentByGtin, normalizeGtin } from './product-enrich.mjs';

/**
 * @param {{ naRef?: string|null, ean?: string|null, skipGtinHub?: boolean, useCache?: boolean }} input
 */
export async function resolveProductName(input = {}) {
  const naRef = input.naRef ? String(input.naRef).trim() : null;
  let ean = normalizeGtin(input.ean || '');
  let naArticle = null;
  let eanSource = ean ? 'argument' : null;

  if (naRef) {
    const na = await fetchNaStockArticle(naRef);
    if (na.error && !ean) {
      return { merged: null, reason: `na_${na.error}`, naRef, ean: null, naArticle: na.article || null };
    }
    if (na.article) {
      naArticle = na.article;
      const naEan = normalizeGtin(na.article.ean);
      if (naEan) {
        if (ean && ean !== naEan) {
          eanSource = 'na_override';
        } else {
          eanSource = 'na';
        }
        ean = naEan;
      }
    }
  }

  if (!ean || ean.length < 8) {
    return { merged: null, reason: 'ean_invalido', naRef, ean, naArticle, eanSource };
  }

  const { merged, reason, sources, fromCache } = await fetchFullEnrichmentByGtin(ean, {
    skipGtinHub: input.skipGtinHub,
    skipUpc: input.skipUpc,
    useCache: input.useCache !== false,
  });

  return {
    merged,
    reason,
    sources,
    fromCache,
    naRef,
    ean,
    eanSource,
    naArticle,
    naPrice: naArticle?.price != null ? Number(naArticle.price) : null,
    naStock: naArticle?.amount != null ? Number(naArticle.amount) : null,
  };
}
