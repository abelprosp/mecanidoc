export type GtinProductDetail = {
  gtin: string;
  name?: string;
  brand?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  specs?: Record<string, unknown>;
  labels?: Record<string, unknown>;
  source: 'gtinhub' | 'upcitemdb' | 'tire_catalog' | 'eprel' | 'ean_heuristics';
  raw?: unknown;
};

export type GtinEnrichPatch = {
  name?: string;
  brand?: string;
  description?: string;
  category?: string;
  images?: string[];
  specs?: Record<string, unknown>;
  labels?: Record<string, unknown>;
  gtinMetadata?: Record<string, unknown>;
};

export type GtinEnrichResult = {
  ok: boolean;
  productId?: string;
  ean?: string;
  patch?: GtinEnrichPatch;
  source?: string;
  error?: string;
  skipped?: boolean;
};
