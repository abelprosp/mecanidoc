import 'server-only';

/** Regras de categoria/marca por prefixo GS1 (catálogo europeu). */

export const PRODUCT_CATEGORIES = ['Auto', 'Moto', 'Camion', 'Tracteur'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PREFIX_RULES: Array<{ prefix: string; brand: string | null; category: ProductCategory }> = [
  { prefix: '3831126', brand: 'Mitas', category: 'Moto' },
  { prefix: '3831127', brand: 'Mitas', category: 'Moto' },
  { prefix: '383', brand: 'Mitas', category: 'Moto' },
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
  { prefix: '403234', brand: 'Continental', category: 'Auto' },
  { prefix: '401923', brand: 'Continental', category: 'Auto' },
  { prefix: '8808956', brand: 'Nexen', category: 'Auto' },
  { prefix: '8807622', brand: 'Hankook', category: 'Auto' },
  { prefix: '8808563', brand: 'Kumho', category: 'Auto' },
  { prefix: '880762', brand: 'Hankook', category: 'Auto' },
  { prefix: '880856', brand: 'Kumho', category: 'Auto' },
  { prefix: '8590341', brand: 'Barum', category: 'Auto' },
  { prefix: '859034', brand: 'Barum', category: 'Auto' },
  { prefix: '6959956', brand: 'Triangle', category: 'Auto' },
  { prefix: '6950306', brand: 'Linglong', category: 'Auto' },
  { prefix: '695030', brand: 'Linglong', category: 'Auto' },
  { prefix: '693388', brand: 'Sailun', category: 'Auto' },
  { prefix: '697190', brand: 'Goodride', category: 'Auto' },
  { prefix: '697654', brand: 'Westlake', category: 'Auto' },
  { prefix: '8903635', brand: 'MRF', category: 'Auto' },
  { prefix: '3528703', brand: 'Kleber', category: 'Auto' },
  { prefix: '352870', brand: 'Michelin', category: 'Auto' },
  { prefix: '8019227', brand: 'Pirelli', category: 'Auto' },
  { prefix: '801922', brand: 'Pirelli', category: 'Auto' },
  { prefix: '3286340', brand: 'Sava', category: 'Auto' },
  { prefix: '328634', brand: 'Sava', category: 'Auto' },
  { prefix: '5420068', brand: 'Giti', category: 'Auto' },
  { prefix: '5600944', brand: 'Falken', category: 'Auto' },
  { prefix: '496881', brand: 'Yokohama', category: 'Auto' },
  { prefix: '498191', brand: 'Toyo', category: 'Auto' },
  { prefix: '641944', brand: 'Nokian', category: 'Auto' },
  { prefix: '471778', brand: 'Maxxis', category: 'Auto' },
];

export function normalizeEan(raw: unknown): string {
  return String(raw || '').replace(/\D/g, '');
}

export function classifyByEanPrefix(ean: string) {
  const n = normalizeEan(ean);
  if (n.length < 8) return null;
  const sorted = [...PREFIX_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((r) => n.startsWith(r.prefix)) || null;
}

export function formatTireName(input: {
  brand?: string | null;
  ean?: string | null;
  naRef?: string | null;
  width?: string | null;
  height?: string | null;
  diameter?: string | null;
  loadIndex?: string | null;
  speedIndex?: string | null;
  model?: string | null;
}) {
  const size =
    input.width && input.height && input.diameter
      ? `${input.width}/${input.height} R${input.diameter}`
      : '';
  const load = [input.loadIndex, input.speedIndex].filter(Boolean).join('');
  const parts = [input.brand, input.model, size, load].filter(Boolean);
  if (parts.length >= 2) return parts.join(' ');
  if (parts.length === 1 && size) return parts[0];
  if (input.brand && input.ean) return `${input.brand} · EAN ${input.ean}`;
  if (input.brand && input.naRef) return `${input.brand} · Ref. ${input.naRef}`;
  if (input.ean) return `Pneu EAN ${input.ean}`;
  return `Pneu ref. ${input.naRef || '?'}`;
}

export function buildProductMeta(ean: string, naRef: string | null) {
  const rule = classifyByEanPrefix(ean);
  const category = rule?.category || 'Auto';
  const brand = rule?.brand || null;
  const normalized = normalizeEan(ean);
  const name = formatTireName({ brand, ean: normalized || null, naRef });

  return {
    name,
    brand,
    category,
    description: brand
      ? `Pneu ${brand}. EAN ${normalized || '—'}${naRef ? ` · réf. Andrés ${naRef}` : ''}.`
      : `Importé Neumáticos Andrés. EAN ${normalized || '—'} · réf. ${naRef || '—'}.`,
    specs: {
      source: 'neumaticos_andres',
      na_ref: naRef,
      vehicle_type: category,
    },
  };
}
