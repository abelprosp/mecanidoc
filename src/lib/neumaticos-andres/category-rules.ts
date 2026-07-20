import 'server-only';

/** Regras leves de categoria por prefixo EAN (catálogo europeu NA). */

export const PRODUCT_CATEGORIES = ['Auto', 'Moto', 'Camion', 'Tracteur'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

const PREFIX_RULES: Array<{ prefix: string; brand: string | null; category: ProductCategory }> = [
  { prefix: '3831126', brand: 'Mitas', category: 'Moto' },
  { prefix: '3831127', brand: 'Mitas', category: 'Moto' },
  { prefix: '545200', brand: 'Dunlop', category: 'Moto' },
  { prefix: '4029234', brand: 'Metzeler', category: 'Moto' },
  { prefix: '869063', brand: 'Heidenau', category: 'Moto' },
  { prefix: '546425', brand: 'Goodyear', category: 'Camion' },
  { prefix: '328773', brand: 'Bridgestone', category: 'Camion' },
  { prefix: '900224', brand: 'Semperit', category: 'Camion' },
  { prefix: '871234', brand: 'Michelin', category: 'Camion' },
  { prefix: '570425', brand: 'Fulda', category: 'Camion' },
  { prefix: '890801', brand: 'BKT', category: 'Tracteur' },
  { prefix: '890874', brand: 'BKT', category: 'Tracteur' },
  { prefix: '735002', brand: 'Trelleborg', category: 'Tracteur' },
  { prefix: '735004', brand: 'Trelleborg', category: 'Tracteur' },
  { prefix: '401964', brand: 'Alliance', category: 'Tracteur' },
  { prefix: '890309', brand: 'CEAT', category: 'Tracteur' },
  { prefix: '869069', brand: 'Mitas', category: 'Tracteur' },
  { prefix: '4019238', brand: 'Continental', category: 'Auto' },
  { prefix: '4024068', brand: 'Continental', category: 'Auto' },
  { prefix: '4038526', brand: 'Continental', category: 'Auto' },
  { prefix: '4050496', brand: 'Continental', category: 'Auto' },
  { prefix: '8808956', brand: 'Nexen', category: 'Auto' },
  { prefix: '8807622', brand: 'Hankook', category: 'Auto' },
  { prefix: '8808563', brand: 'Kumho', category: 'Auto' },
  { prefix: '8590341', brand: 'Barum', category: 'Auto' },
  { prefix: '6959956', brand: 'Triangle', category: 'Auto' },
  { prefix: '8903635', brand: 'MRF', category: 'Auto' },
  { prefix: '3528703', brand: 'Kleber', category: 'Auto' },
  { prefix: '8019227', brand: 'Pirelli', category: 'Auto' },
  { prefix: '3286340', brand: 'Sava', category: 'Auto' },
  { prefix: '5420068', brand: null, category: 'Auto' },
  { prefix: '5600944', brand: 'Falken', category: 'Auto' },
];

export function normalizeEan(raw: unknown): string {
  return String(raw || '').replace(/\D/g, '');
}

export function classifyByEanPrefix(ean: string) {
  const n = normalizeEan(ean);
  if (n.length < 8) return null;
  return (
    PREFIX_RULES.find((r) => n.startsWith(r.prefix)) ||
    (n.startsWith('383') ? { brand: 'Mitas', category: 'Moto' as const } : null)
  );
}

export function buildProductMeta(ean: string, naRef: string | null) {
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
  return {
    name: rule.brand ? `${rule.brand} Pneu${refPart}` : `Pneu NA Ref. ${naRef || '?'}`,
    brand,
    category,
    description: `Pneu ${rule.brand}. EAN ${normalized}.`,
    specs: {
      source: 'neumaticos_andres',
      na_ref: naRef,
      season: 'Été',
      vehicle_type: category,
    },
  };
}
