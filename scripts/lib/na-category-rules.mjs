/**
 * Regras de categoria por prefixo EAN/GS1 (catálogo NA).
 * Categorias BD: Auto | Moto | Camion | Tracteur
 */

export const PRODUCT_CATEGORIES = ['Auto', 'Moto', 'Camion', 'Tracteur'];

/** @type {Array<{ prefix: string; brand: string; category: string; vehicleType?: string }>} */
export const PREFIX_RULES = [
  // Moto
  { prefix: '3831126', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '3831127', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '545200', brand: 'Dunlop', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '4029234', brand: 'Metzeler', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '869063', brand: 'Heidenau', category: 'Moto', vehicleType: 'Moto' },

  // Camion (poids lourd)
  { prefix: '546425', brand: 'Goodyear', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '328773', brand: 'Bridgestone', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '900224', brand: 'Semperit', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '871234', brand: 'Michelin', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '570425', brand: 'Fulda', category: 'Camion', vehicleType: 'Camion' },

  // Tracteur / agricole
  { prefix: '890801', brand: 'BKT', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '890874', brand: 'BKT', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '735002', brand: 'Trelleborg', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '735004', brand: 'Trelleborg', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '401964', brand: 'Alliance', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '890309', brand: 'CEAT', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '869069', brand: 'Mitas', category: 'Tracteur', vehicleType: 'Tracteur' },

  // Auto (turismo)
  { prefix: '4019238', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '4024068', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '4038526', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '4050496', brand: 'Continental', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8808956', brand: 'Nexen', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8807622', brand: 'Hankook', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8808563', brand: 'Kumho', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8590341', brand: 'Barum', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '6959956', brand: 'Triangle', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8903635', brand: 'MRF', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '3528703', brand: 'Kleber', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '8019227', brand: 'Pirelli', category: 'Auto', vehicleType: 'Auto' },
  { prefix: '3286340', brand: 'Sava', category: 'Auto', vehicleType: 'Auto' },
  // Prefixo GS1 Giti Group (Giti, Minerva, Radar, etc.) — marca real vem do GTINHub
  { prefix: '5420068', brand: null, category: 'Auto', vehicleType: 'Auto' },
  { prefix: '5600944', brand: 'Falken', category: 'Auto', vehicleType: 'Auto' },
];

const KEYWORD_CATEGORY = [
  { re: /\b(tractor|tracteur|agricol|farm|forestry|flotation)\b/i, category: 'Tracteur' },
  { re: /\b(truck|camion|poids lourd|commercial|steer|drive|trailer)\b/i, category: 'Camion' },
  { re: /\b(moto|motorcycle|scooter|enduro|scooter)\b/i, category: 'Moto' },
];

export function normalizeEan(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function classifyByEanPrefix(ean) {
  const n = normalizeEan(ean);
  if (n.length < 8) return null;

  const rule =
    PREFIX_RULES.find((r) => n.startsWith(r.prefix)) ||
    (n.startsWith('383') ? { brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' } : null);

  return rule;
}

export function classifyByTitle(title) {
  const t = String(title || '');
  for (const { re, category } of KEYWORD_CATEGORY) {
    if (re.test(t)) return category;
  }
  return null;
}

/** Medidas típicas de camião: jante 17.5 / 19.5 / 22.5 / 24.5 */
export function classifyByTireSize(specs) {
  if (!specs) return null;
  const d = String(specs.diameter || '').replace(/[^\d.]/g, '');
  const w = Number(specs.width || 0);
  if (['17.5', '19.5', '22.5', '24.5', '20.5'].includes(d)) return 'Camion';
  if (w >= 900 || (specs.dimension && /\d+\s*R\s*\d{2,3}/i.test(String(specs.dimension)))) {
    return 'Tracteur';
  }
  return null;
}

/**
 * @param {string} ean
 * @param {{ naRef?: string; title?: string; specs?: Record<string, string> }} hints
 */
export function detectProductCategory(ean, hints = {}) {
  const fromTitle = classifyByTitle(hints.title);
  if (fromTitle) return fromTitle;

  const fromSize = classifyByTireSize(hints.specs);
  if (fromSize) return fromSize;

  const rule = classifyByEanPrefix(ean);
  if (rule) return rule.category;

  return 'Auto';
}

/**
 * @param {string} ean
 * @param {string|null} naRef
 */
export function buildProductMeta(ean, naRef) {
  const rule = classifyByEanPrefix(ean);
  const category = rule?.category || 'Auto';
  const brand = rule?.brand || null;
  const normalized = normalizeEan(ean);

  if (!rule) {
    return {
      name: `Pneu NA Ref. ${naRef || '?'}`,
      brand: null,
      category,
      description: `Importado da API Neumáticos Andrés. EAN ${normalized}.`,
      specs: { source: 'neumaticos_andres', na_ref: naRef, season: 'Été', vehicle_type: category },
    };
  }

  const refPart = naRef ? ` · Ref. ${naRef}` : '';
  const fallbackName = rule.brand ? `${rule.brand} Pneu${refPart}` : `Pneu NA Ref. ${naRef || '?'}`;

  return {
    name: fallbackName,
    brand,
    category,
    description: `Pneu ${rule.brand}. EAN ${normalized}.`,
    specs: {
      source: 'neumaticos_andres',
      na_ref: naRef,
      season: 'Été',
      vehicle_type: rule.vehicleType || category,
    },
  };
}
