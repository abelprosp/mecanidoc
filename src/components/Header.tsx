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

// Estrutura base do menu (categorias principais)
const baseNavigationData: Array<{ title: string; key: string; columns: any[][] }> = [
  {
    title: "Pneus Auto",
    key: "Auto",
    columns: []
  },
  {
    title: "Pneu Moto",
    key: "Moto",
    columns: []
  },
  {
    title: "Pneus Camion",
    key: "Camion",
    columns: []
  },
  {
    title: "Pneus Agricoles",
    key: "Tracteur",
    columns: []
  }
];

export default function Header() {
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [navigationData, setNavigationData] = useState<Array<{ title: string; key: string; columns: any[][] }>>(baseNavigationData);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Buscar subcategorias dinamicamente do banco
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data: subcategories } = await supabase
          .from('menu_subcategories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .order('name');

        if (subcategories) {
          // Agrupar subcategorias por parent_category
          const grouped: Record<string, any[]> = {};
          
          subcategories.forEach((sub) => {
            if (!grouped[sub.parent_category]) {
              grouped[sub.parent_category] = [];
            }
            
            const icon = sub.icon_name && iconMap[sub.icon_name] 
              ? iconMap[sub.icon_name] 
              : Car; // Fallback icon
            
            grouped[sub.parent_category].push({
              name: sub.name,
              slug: sub.slug,
              icon: icon
            });
          });

          // Atualizar navigationData com subcategorias do banco
          const updatedNav = baseNavigationData.map((nav) => {
            const subcats = grouped[nav.key] || [];
            
            // Dividir em colunas de 3 itens cada
            const columns: any[][] = [];
            for (let i = 0; i < subcats.length; i += 3) {
              columns.push(subcats.slice(i, i + 3));
            }
            
            return {
              ...nav,
              columns: columns.length > 0 ? columns : [[{ name: "Aucune sous-catégorie", icon: Car }]]
            };
          });

          setNavigationData(updatedNav);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };

    fetchSubcategories();
  }, []);

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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-700 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo - Responsive Size */}
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="MecaniDoc Logo" 
            className="object-contain h-8 w-auto md:h-10 md:w-[180px]" 
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700 h-full">
          {navigationData.map((item) => (
            <div key={item.title} className="group h-full flex items-center">
              <button className="flex items-center gap-1 hover:text-blue-600 h-full border-b-2 border-transparent hover:border-blue-600 transition-colors">
                {item.title} <ChevronDown size={14} />
              </button>
              
              {/* Mega Menu */}
              <div className="absolute left-0 top-full w-full bg-white border border-gray-800 shadow-xl hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex w-full">
                  {item.columns.map((column, colIndex) => (
                    <div key={colIndex} className={`flex-1 p-6 ${colIndex !== item.columns.length - 1 ? 'border-r border-gray-800' : ''}`}>
                      <ul className="space-y-4">
                        {column.map((subItem) => (
                          <li key={subItem.name}>
                            <Link href={`/categorie/${subItem.slug || subItem.name.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors group/item">
                              <subItem.icon size={20} className="text-gray-500 group-hover/item:text-blue-600" />
                              <span className="text-sm font-medium">{subItem.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {item.columns.length < 3 && (
                     <div className="flex-[2]"></div> 
                  )}
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={() => setSearchOpen(true)}
            className="text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="Rechercher"
          >
            <Search size={20} className="md:w-6 md:h-6" />
          </button>
          <Link href="/auth/login" className="text-gray-600 hover:text-blue-600">
            <User size={20} className="md:w-6 md:h-6" />
          </Link>
          <Link href="/checkout" className="text-gray-600 hover:text-blue-600 relative">
            <ShoppingCart size={20} className="md:w-6 md:h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-t border-gray-100 shadow-lg max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4 space-y-2">
            {navigationData.map((item) => (
              <div key={item.title} className="border-b border-gray-100 last:border-0">
                <button 
                  onClick={() => setActiveMobileCategory(activeMobileCategory === item.title ? null : item.title)}
                  className="flex items-center justify-between w-full py-3 text-left font-bold text-gray-800"
                >
                  {item.title}
                  <ChevronDown size={16} className={`transform transition-transform ${activeMobileCategory === item.title ? 'rotate-180' : ''}`} />
                </button>
                
                {activeMobileCategory === item.title && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-2">
                    {item.columns.flat().map((subItem) => (
                      <Link 
                        key={subItem.name}
                        href={`/categorie/${subItem.slug || subItem.name.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                        className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <subItem.icon size={16} />
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
  );
}
