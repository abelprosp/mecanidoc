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
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching brands:', error);
      } else {
        setBrands(data || []);
      }
      setLoading(false);
    };

    fetchBrands();
  }, []);

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
      <div className="py-6 bg-white">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="py-6 bg-white">
      <div className="container mx-auto px-4">
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
