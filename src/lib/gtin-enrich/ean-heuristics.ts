import type { GtinProductDetail } from './types';

/** Prefixos GS1/EAN frequentes no catálogo NA (pré-prod). */
const PREFIX_RULES: Array<{
  prefix: string;
  brand: string;
  category: string;
  vehicleType?: string;
}> = [
  { prefix: '3831126', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '3831127', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '545200', brand: 'Dunlop', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '4029234', brand: 'Metzeler', category: 'Moto', vehicleType: 'Moto' },
  { prefix: '546425', brand: 'Goodyear', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '328773', brand: 'Bridgestone', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '900224', brand: 'Semperit', category: 'Camion', vehicleType: 'Camion' },
  { prefix: '890801', brand: 'BKT', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '890874', brand: 'BKT', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '735002', brand: 'Trelleborg', category: 'Tracteur', vehicleType: 'Tracteur' },
  { prefix: '401964', brand: 'Alliance', category: 'Tracteur', vehicleType: 'Tracteur' },
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
];

export function lookupEanHeuristics(gtin: string, naRef?: string | null): GtinProductDetail | null {
  const ean = gtin.replace(/\D/g, '');
  if (ean.length < 8) return null;

  const rule =
    PREFIX_RULES.find((r) => ean.startsWith(r.prefix)) ||
    (ean.startsWith('383') ? { prefix: '383', brand: 'Mitas', category: 'Moto', vehicleType: 'Moto' } : null);

  if (!rule) return null;

  const refPart = naRef ? ` · Ref. ${naRef}` : '';
  return {
    gtin: ean,
    name: `${rule.brand} Pneu${refPart}`,
    brand: rule.brand,
    description: `Pneu ${rule.brand}. EAN ${ean}${naRef ? ` — ref. fornecedor ${naRef}` : ''}.`,
    category: rule.category,
    specs: {
      season: 'Été',
      vehicle_type: rule.vehicleType || rule.category,
    },
    source: 'ean_heuristics',
  };
}
