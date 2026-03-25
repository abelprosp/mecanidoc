"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, User, ChevronDown, Menu, X,
  CloudSun, Mountain, Truck, Tent, Sun, Snowflake, Car, Zap, Disc,
  Bike, Flag, Star, Map, Box, Navigation,
  Bus, Hammer, MapPin,
  Tractor, Leaf, Factory, Search, CircleDot, Warehouse
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import PromoBanner from './PromoBanner';

// Mapeamento de ícones (fallback se não houver ícone definido)
const iconMap: { [key: string]: any } = {
  'CloudSun': CloudSun,
  'Mountain': Mountain,
  'Truck': Truck,
  'Tent': Tent,
  'Sun': Sun,
  'Snowflake': Snowflake,
  'Car': Car,
  'Zap': Zap,
  'Disc': Disc,
  'Bike': Bike,
  'Flag': Flag,
  'Star': Star,
  'Map': Map,
  'Box': Box,
  'Navigation': Navigation,
  'Bus': Bus,
  'Hammer': Hammer,
  'MapPin': MapPin,
  'Tractor': Tractor,
  'Leaf': Leaf,
  'Factory': Factory,
  'Search': Search,
  'CircleDot': CircleDot,
  'Warehouse': Warehouse,
};

type StaticMenuItem = {
  label: string;
  slug: string;
  iconKey: keyof typeof iconMap;
  /** Se definido, não usa /categorie/[slug] (ex. landing tracteurs). */
  href?: string;
};

function chunkColumns<T>(items: T[], perColumn: number): T[][] {
  const cols: T[][] = [];
  for (let i = 0; i < items.length; i += perColumn) {
    cols.push(items.slice(i, i + perColumn));
  }
  return cols;
}

/** Slug alinhado à função SQL generate_slug (remove não alfanuméricos, hífens). */
function slugFromMenuLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const STATIC_SUBMENU: Record<string, StaticMenuItem[]> = {
  Auto: [
    { label: 'Pneus 4 Saisons', slug: slugFromMenuLabel('Pneus 4 Saisons'), iconKey: 'CloudSun' },
    { label: 'Pneus 4x4/SUV', slug: slugFromMenuLabel('Pneus 4x4/SUV'), iconKey: 'Mountain' },
    { label: 'Pneus camionnette', slug: slugFromMenuLabel('Pneus camionnette'), iconKey: 'Truck' },
    { label: 'Pneus camping', slug: slugFromMenuLabel('Pneus camping'), iconKey: 'Tent' },
    { label: 'Pneus été Auto', slug: slugFromMenuLabel('Pneus été Auto'), iconKey: 'Sun' },
    { label: 'Pneus Hiver', slug: slugFromMenuLabel('Pneus Hiver'), iconKey: 'Snowflake' },
    { label: 'Pneus Voiture', slug: slugFromMenuLabel('Pneus Voiture'), iconKey: 'Car' },
    { label: 'Pneus voiture électrique', slug: slugFromMenuLabel('Pneus voiture électrique'), iconKey: 'Zap' },
    { label: 'Type-c', slug: slugFromMenuLabel('Type-c'), iconKey: 'Disc' },
  ],
  Moto: [
    { label: 'Chopper / Cruiser', slug: slugFromMenuLabel('Chopper / Cruiser'), iconKey: 'Bike' },
    { label: 'Pneus circuit et piste', slug: slugFromMenuLabel('Pneus circuit et piste'), iconKey: 'Flag' },
    { label: 'Pneus cross / enduro / trial', slug: slugFromMenuLabel('Pneus cross / enduro / trial'), iconKey: 'Mountain' },
    { label: 'Pneus custom et collection', slug: slugFromMenuLabel('Pneus custom et collection'), iconKey: 'Star' },
    { label: 'Pneus moto sport et route', slug: slugFromMenuLabel('Pneus moto sport et route'), iconKey: 'Navigation' },
    { label: 'Pneus scooter', slug: slugFromMenuLabel('Pneus scooter'), iconKey: 'Box' },
    { label: 'Pneus trail', slug: slugFromMenuLabel('Pneus trail'), iconKey: 'Map' },
    { label: 'Quad / Véhicule tout terrain', slug: slugFromMenuLabel('Quad / Véhicule tout terrain'), iconKey: 'Mountain' },
    { label: 'Sport Tourisme diagonal', slug: slugFromMenuLabel('Sport Tourisme diagonal'), iconKey: 'Disc' },
    { label: 'Sport Tourisme radial', slug: slugFromMenuLabel('Sport Tourisme radial'), iconKey: 'Disc' },
  ],
  Camion: [
    { label: 'Pneus autocar - autobus', slug: slugFromMenuLabel('Pneus autocar - autobus'), iconKey: 'Bus' },
    { label: 'Pneus chantier', slug: slugFromMenuLabel('Pneus chantier'), iconKey: 'Hammer' },
    { label: 'Pneus longue distance', slug: slugFromMenuLabel('Pneus longue distance'), iconKey: 'Truck' },
    { label: 'Pneus régionaux', slug: slugFromMenuLabel('Pneus régionaux'), iconKey: 'MapPin' },
  ],
  Tracteur: [
    { label: 'Pneus avant tracteur', slug: slugFromMenuLabel('Pneus avant tracteur'), iconKey: 'Tractor' },
    { label: 'Pneus espaces verts', slug: slugFromMenuLabel('Pneus espaces verts'), iconKey: 'Leaf' },
    { label: 'Pneus industriel et manutention', slug: slugFromMenuLabel('Pneus industriel et manutention'), iconKey: 'Factory' },
    { label: 'Pneus remorque agricole', slug: slugFromMenuLabel('Pneus remorque agricole'), iconKey: 'Warehouse' },
    { label: 'Pneus roue motrice', slug: slugFromMenuLabel('Pneus roue motrice'), iconKey: 'CircleDot' },
    { label: 'Recherche par dimension', slug: 'tracteurs', iconKey: 'Search', href: '/tracteurs' },
  ],
};

const NAV_ENTRIES: Array<{
  title: string;
  key: keyof typeof STATIC_SUBMENU;
  mainHref: string;
  columnsPerChunk: number;
}> = [
  { title: 'Pneus Auto', key: 'Auto', mainHref: '/', columnsPerChunk: 3 },
  { title: 'Pneu Moto', key: 'Moto', mainHref: '/moto', columnsPerChunk: 3 },
  { title: 'Pneus Camion', key: 'Camion', mainHref: '/camion', columnsPerChunk: 2 },
  { title: 'Pneus Agricoles', key: 'Tracteur', mainHref: '/tracteurs', columnsPerChunk: 3 },
];

function buildNavigationData() {
  return NAV_ENTRIES.map((entry) => {
    const raw = STATIC_SUBMENU[entry.key];
    const items = raw.map((s) => ({
      label: s.label,
      slug: s.slug,
      href: s.href,
      icon: iconMap[s.iconKey] || Car,
    }));
    return {
      title: entry.title,
      key: entry.key,
      mainHref: entry.mainHref,
      columns: chunkColumns(items, entry.columnsPerChunk),
    };
  });
}

const navigationDataStatic = buildNavigationData();

export default function Header() {
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Busca de produtos
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      setSearchLoading(true);
      const query = searchQuery.trim().toLowerCase();
      
      try {
        // Buscar produtos por múltiplos atributos
        let productsQuery = supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .limit(10);

        // Busca por nome do produto
        const { data: byName } = await supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('name', `%${query}%`)
          .limit(10);

        // Busca por marca
        const { data: byBrand } = await supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('brand', `%${query}%`)
          .limit(10);

        // Busca por categoria
        const { data: byCategory } = await supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('category', `%${query}%`)
          .limit(10);

        // Busca por pa_tipo
        const { data: byPaTipo } = await supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('pa_tipo', `%${query}%`)
          .limit(10);

        // Busca nas especificações (specs JSONB) - fazer múltiplas queries
        const specsQueries = [
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { width: query }).limit(10),
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { height: query }).limit(10),
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { diameter: query }).limit(10),
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { load_index: query }).limit(10),
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { speed_index: query }).limit(10),
          supabase.from('products').select('*, brands(id, name, logo_url)').eq('is_active', true).contains('specs', { season: query }).limit(10),
        ];
        
        const specsResults = await Promise.all(specsQueries.map(q => q));
        const bySpecs = specsResults.flatMap(result => result.data || []);

        // Combinar todos os resultados e remover duplicatas
        const allResults = [
          ...(byName || []),
          ...(byBrand || []),
          ...(byCategory || []),
          ...(byPaTipo || []),
          ...(bySpecs || [])
        ];

        // Remover duplicatas por ID
        const uniqueResults = allResults.filter((product, index, self) => 
          index === self.findIndex((p) => p.id === product.id)
        );

        setSearchResults(uniqueResults.slice(0, 10));
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Focar no input quando o modal abrir
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const router = useRouter();

  const handleProductClick = (productId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/product/${productId}`);
  };

  return (
    <>
    <header className="sticky top-0 z-50 w-full">
      <div className="layout-container pt-2 md:pt-3">
        <div className="relative">
          <div className="relative bg-white shadow-sm h-16 md:h-20 grid grid-cols-[auto_1fr_auto] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 md:gap-x-3 px-3 sm:px-4 md:px-5">
        <div className="flex items-center gap-1 min-w-0 justify-self-start">
          <button 
            className="md:hidden text-gray-700 p-2 shrink-0"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <img 
              src="/logo.png" 
              alt="MecaniDoc Logo" 
              className="object-contain h-8 w-auto max-h-8 md:max-h-9 max-w-[min(160px,42vw)]" 
            />
          </Link>
        </div>

        {/* Desktop Navigation — coluna central para alinhar ao centro da barra */}
        <nav className="hidden md:flex items-center justify-center gap-2 lg:gap-3 text-sm font-medium text-gray-700 h-full min-w-0 justify-self-center">
          {navigationDataStatic.map((item) => (
            <div key={item.title} className="group h-full flex items-center">
              <Link
                href={item.mainHref}
                className="flex items-center gap-1 hover:text-blue-600 h-full border-b-2 border-transparent hover:border-blue-600 transition-colors whitespace-nowrap"
              >
                {item.title} <ChevronDown size={14} className="opacity-60 shrink-0" aria-hidden />
              </Link>
              
              <div className="absolute left-0 right-0 top-full z-[60] hidden w-full group-hover:block pointer-events-none group-hover:pointer-events-auto">
                <div className="w-full bg-white border border-gray-200 border-t-0 shadow-xl rounded-b-lg animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex w-full">
                    {item.columns.map((column, colIndex) => (
                      <div key={colIndex} className={`flex-1 min-w-0 py-4 px-3 sm:px-4 md:px-5 ${colIndex !== item.columns.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        <ul className="space-y-2">
                        {column.map((subItem) => {
                          const href = subItem.href ?? `/categorie/${subItem.slug}`;
                          return (
                          <li key={`${subItem.slug}-${subItem.label}`}>
                            <Link href={href} className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors group/item">
                              <subItem.icon size={20} className="text-gray-500 group-hover/item:text-blue-600 shrink-0" />
                              <span className="text-sm font-medium">{subItem.label}</span>
                            </Link>
                          </li>
                          );
                        })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5 md:gap-2 shrink-0 min-w-0 justify-self-end">
          <button 
            onClick={() => setSearchOpen(true)}
            className="text-gray-600 hover:text-blue-600 transition-colors p-1"
            aria-label="Rechercher"
          >
            <Search size={20} className="w-5 h-5" />
          </button>
          <Link href="/auth/login" className="text-gray-600 hover:text-blue-600 p-1">
            <User size={20} className="w-5 h-5" />
          </Link>
          <Link href="/checkout" className="text-gray-600 hover:text-blue-600 relative p-1">
            <ShoppingCart size={20} className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
          </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-40 mt-0 w-full bg-white border border-gray-200 border-t-0 shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="p-4 space-y-2">
            {navigationDataStatic.map((item) => (
              <div key={item.title} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 py-2">
                  <Link
                    href={item.mainHref}
                    className="flex-1 py-2 text-left font-bold text-gray-800 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                  <button 
                    type="button"
                    onClick={() => setActiveMobileCategory(activeMobileCategory === item.title ? null : item.title)}
                    className="p-2 text-gray-600"
                    aria-expanded={activeMobileCategory === item.title}
                    aria-label={`Sous-menu ${item.title}`}
                  >
                    <ChevronDown size={16} className={`transform transition-transform ${activeMobileCategory === item.title ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {activeMobileCategory === item.title && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-2">
                    {item.columns.flat().map((subItem) => {
                      const href = subItem.href ?? `/categorie/${subItem.slug}`;
                      return (
                      <Link 
                        key={`${subItem.slug}-${subItem.label}`}
                        href={href}
                        className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <subItem.icon size={16} className="shrink-0" />
                        {subItem.label}
                      </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20 md:pt-32"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false);
              setSearchQuery('');
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Search Input */}
            <div className="p-4 border-b flex items-center gap-3">
              <Search className="text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher par nom, marque, catégorie, dimensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }
                }}
              />
              {searchLoading && <Loader2 className="animate-spin text-gray-400" size={20} />}
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchQuery.length < 2 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  Tapez au moins 2 caractères pour rechercher
                </p>
              ) : searchLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  Aucun produit trouvé pour "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                  </p>
                  {searchResults.map((product) => {
                    const specs = product.specs || {};
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Product Image */}
                          <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={product.images?.[0] || 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Pneu'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {product.brands?.logo_url ? (
                                <img
                                  src={product.brands.logo_url}
                                  alt={product.brands.name}
                                  className="h-4 w-auto object-contain"
                                />
                              ) : (
                                <span className="text-xs font-bold text-gray-600 uppercase">
                                  {product.brands?.name || product.brand || 'Marque'}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm mb-1 truncate group-hover:text-blue-600">
                              {product.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {specs.width}/{specs.height} R{specs.diameter} {specs.load_index}{specs.speed_index}
                              {specs.autres_categories && specs.autres_categories.length > 0 && (
                                <span className="ml-1">• {specs.autres_categories.join(', ')}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {product.category || 'Auto'} {product.pa_tipo && `• ${product.pa_tipo}`}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0 text-right">
                            <p className="font-bold text-gray-800">
                              €{product.base_price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium text-center block"
                >
                  Voir tous les résultats pour "{searchQuery}"
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
    <PromoBanner />
    </>
  );
}
