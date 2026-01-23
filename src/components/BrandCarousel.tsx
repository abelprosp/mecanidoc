"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface BrandCarouselProps {
  category?: string;
}

export default function BrandCarousel({ category = 'Auto' }: BrandCarouselProps) {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mapeamento de categorias para títulos
  const categoryTitles: { [key: string]: string } = {
    'Auto': 'Auto',
    'Moto': 'Moto',
    'Camion': 'Poids Lourd',
    'Tracteur': 'Agricoles'
  };

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      console.log('🔍 BrandCarousel - Buscando marcas para categoria:', category);
      
      if (category) {
        // Buscar apenas marcas que têm produtos ativos na categoria específica
        const normalizedCategory = category.trim().toLowerCase();
        console.log('🔍 Categoria normalizada:', normalizedCategory);
        
        // Buscar produtos da categoria com suas marcas - usar múltiplas queries para garantir
        const normalizedCategoryUpper = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
        
        // Query 1: Buscar por categoria exata (lowercase)
        const { data: productsData1 } = await supabase
          .from('products')
          .select('brand_id, brand, category, brands(id, name, logo_url)')
          .eq('is_active', true)
          .eq('category', normalizedCategory);
        
        // Query 2: Buscar por categoria exata (uppercase)
        const { data: productsData2 } = await supabase
          .from('products')
          .select('brand_id, brand, category, brands(id, name, logo_url)')
          .eq('is_active', true)
          .eq('category', normalizedCategoryUpper);
        
        // Query 3: Buscar por categoria case-insensitive
        const { data: productsData3 } = await supabase
          .from('products')
          .select('brand_id, brand, category, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('category', normalizedCategory);
        
        // Combinar todos os resultados e remover duplicatas
        const allProductsMap = new Map<string, any>();
        [...(productsData1 || []), ...(productsData2 || []), ...(productsData3 || [])].forEach((product: any) => {
          const key = product.brand_id || product.brand || `brand_${product.brand}`;
          if (!allProductsMap.has(key)) {
            allProductsMap.set(key, product);
          }
        });
        
        const productsData = Array.from(allProductsMap.values());
        const productsError = null;

        if (productsError) {
          console.error('❌ Error fetching products for brands:', productsError);
          setLoading(false);
          return;
        }

        console.log('📦 Total de produtos encontrados:', productsData?.length || 0);

        // Filtrar produtos pela categoria (case-insensitive) e extrair marcas únicas
        const brandMap = new Map<string, any>();
        
        (productsData || []).forEach((product: any) => {
          const productCategory = (product.category || '').toLowerCase();
          
          // Verificar se o produto pertence à categoria
          if (productCategory === normalizedCategory) {
            // Priorizar brand_id se existir
            if (product.brand_id && product.brands) {
              if (!brandMap.has(product.brand_id)) {
                brandMap.set(product.brand_id, product.brands);
              }
            } else if (product.brand) {
              // Se não houver brand_id, usar o nome da marca
              const brandName = product.brand.trim();
              if (!brandMap.has(brandName)) {
                brandMap.set(brandName, {
                  id: null,
                  name: brandName,
                  logo_url: null
                });
              }
            }
          }
        });

        console.log('🏷️ Marcas únicas encontradas:', brandMap.size);

        // Converter Map para array e ordenar por nome
        const uniqueBrands = Array.from(brandMap.values())
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        console.log('✅ Marcas finais:', uniqueBrands.length, uniqueBrands.map(b => b.name));
        setBrands(uniqueBrands);
      } else {
        // Se não houver categoria, mostrar todas as marcas (comportamento padrão)
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching brands:', error);
        } else {
          console.log('📋 Todas as marcas (sem filtro):', data?.length || 0);
          setBrands(data || []);
        }
      }
      
      setLoading(false);
    };

    fetchBrands();
  }, [category]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="py-2 md:py-6 bg-white">
        <div className="md:container md:mx-auto md:px-4 flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (brands.length === 0) {
    console.log('⚠️ BrandCarousel - Nenhuma marca encontrada para categoria:', category);
    return null;
  }

  console.log('✅ BrandCarousel - Renderizando com', brands.length, 'marcas');

  return (
    <section className="py-2 md:py-6 bg-white">
      <div className="md:container md:mx-auto md:px-4">
        {/* Title - horizontal like BestSellers */}
        <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
          Marques Pneus {categoryTitles[category] || category}
        </h2>
        
        {/* Carousel */}
        <div className="relative group">
          {/* Left Button */}
          <button 
            onClick={() => scroll('left')}
            className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:shadow-xl text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Cards Container */}
          <div 
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
          >
            {brands.map((brand) => (
              <div 
                key={brand.id} 
                className="flex-shrink-0 snap-center"
                onClick={() => window.location.href = `/search?brand=${encodeURIComponent(brand.name)}&category=${encodeURIComponent(category)}`}
              >
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow w-28 h-20 md:w-32 md:h-24 flex flex-col items-center justify-center p-3 gap-2 cursor-pointer">
                  <div className="h-8 md:h-10 flex items-center justify-center w-full">
                    {brand.logo_url ? (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name} 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-300">{brand.name[0]}</span>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs font-bold uppercase text-gray-700 text-center truncate w-full">{brand.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Button */}
          <button 
            onClick={() => scroll('right')}
            className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:shadow-xl text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
