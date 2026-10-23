const EPREL_BASE = (process.env.EPREL_BASE_URL || 'https://eprel.ec.europa.eu/api').replace(/\/$/, '');

export function getEprelKey() {
  return process.env.EPREL_API_KEY?.trim() || '';
}

function headers() {
  const key = getEprelKey();
  if (!key) return null;
  return { Accept: 'application/json', 'X-API-KEY': key };
}

export function normalizeGtin(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function pickHit(json, { strict = false } = {}) {
  if (!json || typeof json !== 'object') return null;
  if (json.code === 'NOT_FOUND') return null;
  if (Array.isArray(json.hits)) return json.hits[0] || null;
  if (json.tyreSection != null || json.eprelRegistrationNumber) return json;
  if (strict) throw new Error('EPREL HTTP 200: estrutura de resposta inesperada');
  return null;
}

export async function fetchEprelByGtin(gtin, { strict = false } = {}) {
  const h = headers();
  if (!h) {
    if (strict) throw new Error('EPREL_API_KEY não configurada');
    return null;
  }
  const normalized = normalizeGtin(gtin);
  if (normalized.length < 8) return null;

  const res = await fetch(`${EPREL_BASE}/product/gtin/${encodeURIComponent(normalized)}`, {
    headers: h,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    if (strict) throw new Error(`EPREL HTTP ${res.status}`);
    return null;
  }
  let json;
  try {
    json = await res.json();
  } catch {
    if (strict) throw new Error(`EPREL HTTP ${res.status}: resposta não é JSON válido`);
    return null;
  }
  return pickHit(json, { strict });
}

function pickProductRows(json) {
  if (Array.isArray(json)) return json;
  for (const key of ['content', 'products', 'hits', 'results', 'data']) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

/** Busca pneus no registo público EPREL pelo identificador do modelo, como no portal. */
export async function fetchEprelTyresByModelIdentifier(identifier, { strict = false } = {}) {
  const h = headers();
  if (!h) {
    if (strict) throw new Error('EPREL_API_KEY não configurada');
    return [];
  }
  const value = String(identifier || '').trim();
  if (!value) return [];

  const params = new URLSearchParams({ modelIdentifier: value, _page: '1', _limit: '100' });
  const res = await fetch(`${EPREL_BASE}/products/tyres?${params}`, {
    headers: h,
    redirect: 'error',
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    if (strict) throw new Error(`EPREL HTTP ${res.status} na busca por dimensão`);
    return [];
  }
  const json = await res.json();
  const rows = pickProductRows(json);
  if (!rows.length && strict && !Array.isArray(json?.content) && !Array.isArray(json?.products) && !Array.isArray(json?.hits) && !Array.isArray(json?.results) && !Array.isArray(json?.data)) {
    throw new Error('EPREL HTTP 200: resposta de busca por dimensão inesperada');
  }
  return rows;
}

export async function fetchEprelTyreByRegistrationNumber(registrationNumber, { strict = false } = {}) {
  const h = headers();
  if (!h || !registrationNumber) {
    if (strict && !h) throw new Error('EPREL_API_KEY não configurada');
    return null;
  }
  const res = await fetch(`${EPREL_BASE}/products/tyres/${encodeURIComponent(registrationNumber)}`, {
    headers: h,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    if (strict) throw new Error(`EPREL HTTP ${res.status} ao ler o registo ${registrationNumber}`);
    return null;
  }
  const json = await res.json();
  return pickHit(json, { strict }) || json;
}

export function mapEprelHit(hit) {
  if (!hit) return null;

  // The public product-group API may nest tyre fields under technicalParameters;
  // the older GTIN endpoint returns most of them at the top level.
  const fields = { ...hit, ...(hit.technicalParameters || {}) };

  const brand = fields.supplierOrTrademark || fields.brandName || fields.organisation?.organisationName;
  const size = fields.tyreDesignation || fields.sizeDesignationFiltered || fields.sizeDesignation;
  const commercial = fields.commercialName || fields.modelIdentifier;
  const name = [brand, commercial, size].filter(Boolean).join(' ');

  const specs = { season: 'Été' };
  if (fields.tyreSection != null) specs.width = String(fields.tyreSection);
  if (fields.aspectRatio != null) specs.height = String(fields.aspectRatio);
  if (fields.rimDiameter != null) specs.diameter = String(fields.rimDiameter);
  if (fields.loadCapacityIndex != null) specs.load_index = String(fields.loadCapacityIndex);
  if (fields.speedCategorySymbol) specs.speed_index = String(fields.speedCategorySymbol);
  if (size) specs.eprel_size = size;

  const labels = {};
  if (fields.energyClass || fields.fuelEfficiencyClass) labels.fuel = fields.energyClass || fields.fuelEfficiencyClass;
  if (fields.wetGripClass) labels.wet = fields.wetGripClass;
  if (fields.externalRollingNoiseValue != null) labels.noise = String(fields.externalRollingNoiseValue);
  if (fields.externalRollingNoiseClass) labels.noise_class = fields.externalRollingNoiseClass;

  let category;
  const tc = fields.tyreClass;
  const designation = String(size || '').toLowerCase();
  if (tc === 'C3' || tc === 'C2') category = 'Camion';
  else if (tc === 'C1') category = 'Auto';
  else if (/\b(agric|tractor|tracteur|flotation|industrial)\b/i.test(designation)) category = 'Tracteur';
  else if (/\b(steer|drive|trailer|truck)\b/i.test(designation)) category = 'Camion';

  return {
    source: 'eprel',
    registrationNumber: fields.eprelRegistrationNumber || fields.registrationNumber || fields.id,
    productGroup: fields.productGroup || 'tyres',
    name: name.trim() || undefined,
    brand,
    category,
    description: name.trim() || undefined,
    specs,
    labels: Object.keys(labels).length ? labels : undefined,
    tyreClass: fields.tyreClass,
  };
}

export async function fetchEprelProductByGtin(gtin, options) {
  const hit = await fetchEprelByGtin(gtin, options);
  return mapEprelHit(hit);
}

/** Etiqueta UE em PNG (melhor para cartão de produto). */
export async function fetchEprelLabelPng(registrationNumber, productGroup = 'tyres') {
  const key = getEprelKey();
  if (!key || !registrationNumber) return null;

  const group = String(productGroup || 'tyres').toLowerCase();
  const url = `${EPREL_BASE}/products/${encodeURIComponent(group)}/${encodeURIComponent(registrationNumber)}/labels?format=PNG`;

  const res = await fetch(url, {
    headers: { 'X-API-KEY': key, Accept: 'image/png,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html') || ct.includes('application/json')) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) return null;
  return { buffer, contentType: ct.includes('png') ? 'image/png' : 'image/png' };
}
