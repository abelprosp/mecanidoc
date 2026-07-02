import type { EprelEnrichPatch, EprelProductDetail } from './types';

function readString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  }
  return undefined;
}

function parseTyreSize(raw?: string) {
  if (!raw) return null;
  const match = raw.match(/(\d{3})\/(\d{2})\s*R\s*(\d{2})/i);
  if (!match) return null;
  return { width: match[1], height: match[2], diameter: match[3] };
}

export function mapEprelToProductPatch(detail: EprelProductDetail): EprelEnrichPatch {
  const tp = (detail.technicalParameters || {}) as Record<string, unknown>;
  const flat = detail as Record<string, unknown>;

  const brand =
    detail.brandName ||
    detail.supplierOrTrademark ||
    readString(flat, ['supplierOrTrademark']) ||
    readString(tp, ['supplierOrTrademark', 'brandName', 'brand']);

  const commercialName =
    detail.commercialName ||
    readString(flat, ['commercialName']) ||
    readString(tp, ['commercialName', 'commercialNameOfProduct', 'modelIdentifier']) ||
    detail.modelIdentifier;

  const sizeDesignation =
    readString(flat, ['tyreDesignation', 'sizeDesignationFiltered']) ||
    readString(tp, ['tyreSizeDesignation', 'sizeDesignation', 'tyreDesignation', 'tyreSize', 'size']);

  const loadIndex =
    readString(flat, ['loadCapacityIndex']) ||
    readString(tp, ['loadCapacityIndex', 'loadIndex', 'loadCapacityIndexSingle']);
  const speedIndex =
    readString(flat, ['speedCategorySymbol']) ||
    readString(tp, ['speedCategorySymbol', 'speedIndex', 'speedSymbol']);

  const parsedSize = parseTyreSize(sizeDesignation || commercialName || detail.modelIdentifier);

  const fuel =
    readString(flat, ['energyClass']) ||
    readString(tp, ['fuelEfficiencyClass', 'rollingResistanceClass', 'energyClass']) ||
    detail.energyClass;
  const wet = readString(flat, ['wetGripClass']) || readString(tp, ['wetGripClass', 'wetGrip']);
  const noise =
    readString(flat, ['externalRollingNoiseValue']) ||
    readString(tp, ['externalRollingNoiseValue', 'externalRollingNoiseLevel', 'noiseLevel']);
  const noiseClass =
    readString(flat, ['externalRollingNoiseClass']) ||
    readString(tp, ['externalRollingNoiseClass', 'noiseClass']);

  const nameParts = [brand, commercialName, sizeDesignation].filter(Boolean);
  const name = nameParts.join(' ').replace(/\s+/g, ' ').trim();

  const specs: Record<string, unknown> = {};
  if (parsedSize?.width) specs.width = parsedSize.width;
  if (parsedSize?.height) specs.height = parsedSize.height;
  if (parsedSize?.diameter) specs.diameter = parsedSize.diameter;
  if (!specs.width && flat.tyreSection != null) specs.width = String(flat.tyreSection);
  if (!specs.height && flat.aspectRatio != null) specs.height = String(flat.aspectRatio);
  if (!specs.diameter && flat.rimDiameter != null) specs.diameter = String(flat.rimDiameter);
  if (loadIndex) specs.load_index = loadIndex;
  if (speedIndex) specs.speed_index = speedIndex;
  if (sizeDesignation) specs.eprel_size = sizeDesignation;
  if (!specs.season) specs.season = 'Été';

  const labels: Record<string, unknown> = {};
  if (fuel) labels.fuel = fuel;
  if (wet) labels.wet = wet;
  if (noise) labels.noise = noise;
  if (noiseClass) labels.noise_class = noiseClass;
  if (detail.energyLabelUrl) labels.label_url = detail.energyLabelUrl;

  return {
    name: name || undefined,
    brand,
    description: [brand, commercialName, sizeDesignation, loadIndex && speedIndex ? `${loadIndex}${speedIndex}` : null]
      .filter(Boolean)
      .join(' · ') || undefined,
    specs: Object.keys(specs).length ? specs : undefined,
    labels: Object.keys(labels).length ? labels : undefined,
    eprelMetadata: {
      registrationNumber: detail.registrationNumber,
      productGroup: detail.productGroup,
      energyLabelUrl: detail.energyLabelUrl,
      productInformationSheetUrl: detail.productInformationSheetUrl,
      gtin: detail.gtin || readString(tp, ['gtin', 'gtinIdentifier']),
      enrichedAt: new Date().toISOString(),
    },
  };
}
