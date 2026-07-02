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

function pickHit(json) {
  if (!json || typeof json !== 'object') return null;
  if (json.code === 'NOT_FOUND') return null;
  if (Array.isArray(json.hits)) return json.hits[0] || null;
  if (json.tyreSection != null || json.eprelRegistrationNumber) return json;
  return null;
}

export async function fetchEprelByGtin(gtin) {
  const h = headers();
  if (!h) return null;
  const normalized = normalizeGtin(gtin);
  if (normalized.length < 8) return null;

  const res = await fetch(`${EPREL_BASE}/product/gtin/${encodeURIComponent(normalized)}`, {
    headers: h,
  });
  if (!res.ok) return null;
  return pickHit(await res.json());
}

export function mapEprelHit(hit) {
  if (!hit) return null;

  const brand = hit.supplierOrTrademark || hit.organisation?.organisationName;
  const size = hit.tyreDesignation || hit.sizeDesignationFiltered;
  const commercial = hit.commercialName || hit.modelIdentifier;
  const name = [brand, commercial, size].filter(Boolean).join(' ');

  const specs = { season: 'Été' };
  if (hit.tyreSection != null) specs.width = String(hit.tyreSection);
  if (hit.aspectRatio != null) specs.height = String(hit.aspectRatio);
  if (hit.rimDiameter != null) specs.diameter = String(hit.rimDiameter);
  if (hit.loadCapacityIndex != null) specs.load_index = String(hit.loadCapacityIndex);
  if (hit.speedCategorySymbol) specs.speed_index = String(hit.speedCategorySymbol);
  if (size) specs.eprel_size = size;

  const labels = {};
  if (hit.energyClass) labels.fuel = hit.energyClass;
  if (hit.wetGripClass) labels.wet = hit.wetGripClass;
  if (hit.externalRollingNoiseValue != null) labels.noise = String(hit.externalRollingNoiseValue);
  if (hit.externalRollingNoiseClass) labels.noise_class = hit.externalRollingNoiseClass;

  let category;
  const tc = hit.tyreClass;
  const designation = String(size || '').toLowerCase();
  if (tc === 'C3' || tc === 'C2') category = 'Camion';
  else if (tc === 'C1') category = 'Auto';
  else if (/\b(agric|tractor|tracteur|flotation|industrial)\b/i.test(designation)) category = 'Tracteur';
  else if (/\b(steer|drive|trailer|truck)\b/i.test(designation)) category = 'Camion';

  return {
    source: 'eprel',
    registrationNumber: hit.eprelRegistrationNumber || hit.registrationNumber,
    productGroup: hit.productGroup || 'tyres',
    name: name.trim() || undefined,
    brand,
    category,
    description: name.trim() || undefined,
    specs,
    labels: Object.keys(labels).length ? labels : undefined,
    tyreClass: hit.tyreClass,
  };
}

export async function fetchEprelProductByGtin(gtin) {
  const hit = await fetchEprelByGtin(gtin);
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
