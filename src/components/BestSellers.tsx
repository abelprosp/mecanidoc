"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ProductCard from './VerticalProductCard';
import {
  applyCategoryToQuery,
  applyPaTipoToQuery,
  productMatchesUiCategory,
  productMatchesPaTipo,
} from '@/lib/product-query-helpers';

interface BestSellersProps {
  category?: string;
  paTipo?: string; // Filtro por pa_tipo (subcategoria do menu)
}

export default function BestSellers({ category, paTipo }: BestSellersProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      let query = supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (category?.trim()) {
        query = applyCategoryToQuery(query, category.trim());
      }
      query = applyPaTipoToQuery(query, paTipo);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        const cat = category?.trim() || '';
        const filtered = (data || []).filter((product: any) => {
          if (!cat) return true;
          if (!productMatchesUiCategory(product.category, cat)) return false;
          return productMatchesPaTipo(product.pa_tipo, paTipo || '');
        });
        setProducts(filtered);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [category, paTipo]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -320 : 320;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="py-4 md:py-6 bg-transparent">
        <div className="layout-container flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-4 md:py-6 bg-transparent relative group">
      <div className="layout-container">
        <h2 className="text-sm font-bold text-gray-900 mb-3 md:mb-5 uppercase tracking-wide">Les meilleures ventes {category ? `- ${category}` : ''}</h2>
        
        <div className="relative">
          {/* Scroll Buttons - Visible on Desktop Hover */}
          <button 
            onClick={() => scroll('left')} 
            className="hidden md:flex absolute left-[-20px] top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 p-3 rounded-full text-gray-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={24} />
          </button>

          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-3 md:gap-5 pb-2 md:pb-4 scrollbar-hide snap-x scroll-smooth"
          >
            {products.map((product) => (
              <div key={product.id} className="min-w-[280px] md:min-w-[300px] snap-center h-full flex-shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')} 
            className="hidden md:flex absolute right-[-20px] top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 p-3 rounded-full text-gray-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll Right"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}
