import type { GtinProductDetail } from './types';

const TIRE_CATALOG: Record<string, GtinProductDetail> = {
  '3831126100834': {
    gtin: '3831126100834',
    name: 'Mitas Sport Force+ 160/60 ZR17 69W TL',
    brand: 'Mitas',
    description:
      'Pneu arrière tubeless radial Mitas Sport Force+ 160/60 ZR17 69W. Idéal moto sport, naked, supermoto et touring. Excellent grip sec/mouillé, stabilité à haute vitesse.',
    category: 'Moto',
    specs: {
      width: '160',
      height: '60',
      diameter: '17',
      load_index: '69',
      speed_index: 'W',
      season: 'Été',
      vehicle_type: 'Moto',
      tube_type: 'TL',
      fitment: 'Rear',
      construction: 'Radial',
      model: 'Sport Force+',
    },
    source: 'tire_catalog',
  },
};

export function fetchFromTireCatalog(gtin: string): GtinProductDetail | null {
  return TIRE_CATALOG[gtin] || null;
}
