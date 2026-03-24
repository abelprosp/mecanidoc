/**
 * Categoria de produtos usada nos filtros (Hero, marcas, bestsellers) por rota principal.
 * Não depender só de `category_pages.product_category_filter`: valores errados na BD
 * (ex. "auto" na página moto) misturavam medidas de automóvel com moto.
 */
export const MAIN_ROUTE_PRODUCT_CATEGORY = {
  home: 'Auto',
  moto: 'Moto',
  camion: 'Camion',
  tracteurs: 'Tracteurs',
} as const;

export type MainRouteCategoryKey = keyof typeof MAIN_ROUTE_PRODUCT_CATEGORY;
