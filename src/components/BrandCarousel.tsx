"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import {
  applyCategoryToQuery,
  applyPaTipoToQuery,
  productMatchesUiCategory,
  productMatchesPaTipo,
} from '@/lib/product-query-helpers';

interface BrandCarouselProps {
  category?: string;
  paTipo?: string | null; // Filtro por pa_tipo (subcategoria do menu)
}

export default function BrandCarousel({ category = 'Auto', paTipo }: BrandCarouselProps) {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mapeamento de categorias para títulos
  const categoryTitles: { [key: string]: string } = {
    Auto: 'Auto',
    Moto: 'Moto',
    Camion: 'Poids Lourd',
    Tracteur: 'Agricoles',
    Tracteurs: 'Agricoles',
  };

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);

      if (category?.trim()) {
        const cat = category.trim();
        let query = supabase
          .from('products')
          .select('brand_id, brand, category, pa_tipo, brands(id, name, logo_url)')
          .eq('is_active', true);
        query = applyCategoryToQuery(query, cat);
        query = applyPaTipoToQuery(query, paTipo);
        const { data: productsData, error } = await query;

        if (error) {
          console.error('BrandCarousel:', error);
          setBrands([]);
          setLoading(false);
          return;
        }

        const brandMap = new Map<string, any>();
        (productsData || []).forEach((product: any) => {
          if (!productMatchesUiCategory(product.category, cat)) return;
          if (!productMatchesPaTipo(product.pa_tipo, paTipo || '')) return;
          if (product.brand_id && product.brands) {
            if (!brandMap.has(product.brand_id)) {
              brandMap.set(product.brand_id, product.brands);
            }
          } else if (product.brand?.trim()) {
            const brandName = product.brand.trim();
            if (!brandMap.has(brandName)) {
              brandMap.set(brandName, {
                id: null,
                name: brandName,
                logo_url: null,
              });
            }
          }
        });

        setBrands(
          Array.from(brandMap.values()).sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        );
      } else {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching brands:', error);
          setBrands([]);
        } else {
          setBrands(data || []);
        }
      }

      setLoading(false);
    };

    fetchBrands();
  }, [category, paTipo]);

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
      <section className="py-2 md:py-4">
        <div className="layout-container">
          <div className="bg-white shadow-sm py-3 md:py-4 px-3 sm:px-4 md:px-5 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="py-2 md:py-4">
      <div className="layout-container">
        <div className="bg-white shadow-sm py-3 md:py-4 px-3 sm:px-4 md:px-5">
        {/* Title - horizontal like BestSellers */}
        <h2 className="text-sm font-bold text-gray-900 mb-2 md:mb-4 uppercase tracking-wide">
          Marques Pneus {paTipo ? paTipo : (categoryTitles[category] || category)}
        </h2>
        
        {/* Carousel */}
        <div className="relative group">
          {/* Left Button */}
          <button 
            onClick={() => scroll('left')}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:shadow-xl text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Cards Container */}
          <div 
            ref={scrollRef}
            className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
          >
            {brands.map((brand) => (
              <div 
                key={brand.id ?? `name-${brand.name}`} 
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
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:shadow-xl text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}
