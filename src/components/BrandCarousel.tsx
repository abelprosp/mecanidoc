"use client";

import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface BrandCarouselProps {
  category?: string;
}

export default function BrandCarousel({ category = 'Auto' }: BrandCarouselProps) {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Mapeamento de categorias para títulos
  const categoryTitles: { [key: string]: string } = {
    'Auto': 'Auto',
    'Moto': 'Moto',
    'Camion': 'Camion',
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

  if (loading) {
    return (
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return null; // Hide if no brands
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg p-6 flex flex-col md:flex-row items-center gap-8">
          
          {/* Left Title Section */}
          <div className="w-full md:w-32 flex-shrink-0 self-start md:self-center pt-4 md:pt-0">
            <h3 className="font-extrabold text-gray-800 text-lg uppercase leading-tight tracking-wide">
              Marques<br />
              Pneus<br />
              {categoryTitles[category] || category}
            </h3>
          </div>
          
          {/* Carousel Section */}
          <div className="flex-1 w-full relative">
            
            {/* Helper Text */}
            <div className="text-center mb-4 text-sm text-gray-400 italic">
               Faites glisser sur le côté →
            </div>

            <div className="relative group">
               {/* Left Button */}
               <button className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100 md:opacity-100">
                 <ChevronLeft size={24} />
               </button>

               {/* Cards Container */}
               <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 scrollbar-hide snap-x">
                 {brands.map((brand) => (
                     <div 
                       key={brand.id} 
                       className="flex-shrink-0 snap-center"
                       onClick={() => window.location.href = `/search?brand=${encodeURIComponent(brand.name)}&category=${encodeURIComponent(category)}`}
                     >
                     <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow w-40 h-32 flex flex-col items-center justify-center p-4 gap-3 cursor-pointer">
                       <div className="h-12 flex items-center justify-center w-full">
                         {brand.logo_url ? (
                           <img 
                             src={brand.logo_url} 
                             alt={brand.name} 
                             className="max-h-full max-w-full object-contain"
                           />
                         ) : (
                           <span className="text-2xl font-bold text-gray-300">{brand.name[0]}</span>
                         )}
                       </div>
                       <span className="text-xs font-bold uppercase text-gray-700">{brand.name}</span>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Right Button */}
               <button className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg text-gray-600 rounded-full p-2 z-10 transition-all">
                 <ChevronRight size={24} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
