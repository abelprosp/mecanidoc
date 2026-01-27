"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import VerticalProductCard from './VerticalProductCard';

interface RelatedProductsProps {
  productId: string;
  category?: string;
  brandId?: string;
  brandName?: string;
  specs?: {
    width?: string;
    height?: string;
    diameter?: string;
  };
}

export default function RelatedProducts({ 
  productId, 
  category, 
  brandId, 
  brandName,
  specs 
}: RelatedProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .eq('is_active', true)
        .neq('id', productId) // Excluir o produto atual
        .limit(12);

      // Filtrar por categoria - garantir match exato para evitar mistura
      if (category) {
        const normalizedCategory = category.trim();
        // Filtrar por categoria exata - garantir que categorias diferentes não se misturem
        query = query.or(
          `category.eq.${normalizedCategory},category.eq.${normalizedCategory.toLowerCase()},category.eq.${normalizedCategory.toUpperCase()}`
        );
      }

      // Filtrar por marca (brand_id ou brand texto)
      if (brandId) {
        query = query.eq('brand_id', brandId);
      } else if (brandName) {
        query = query.ilike('brand', `%${brandName}%`);
      }

      // Filtrar por medidas (width, height, diameter)
      if (specs?.width) {
        query = query.contains('specs', { width: specs.width });
      }
      if (specs?.height) {
        query = query.contains('specs', { height: specs.height });
      }
      if (specs?.diameter) {
        query = query.contains('specs', { diameter: specs.diameter });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching related products:", error);
      } else {
        // Filtro adicional no cliente para garantir match exato (case-insensitive)
        const normalizedCategory = category?.trim().toLowerCase();
        const filtered = (data || []).filter((product: any) => {
          if (!category) return true;
          const productCategory = (product.category || '').toLowerCase();
          return productCategory === normalizedCategory;
        });
        setProducts(filtered);
      }
      setLoading(false);
    };

    if (productId) {
      fetchRelatedProducts();
    }
  }, [productId, category, brandId, brandName, specs]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -320 : 320;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="py-8 bg-transparent">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 bg-transparent relative group">
      <div className="px-2 md:container md:mx-auto md:px-4">
        <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wide">
          Produits similaires
        </h2>
        
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
            className="flex overflow-x-auto gap-4 md:gap-6 pb-4 scrollbar-hide snap-x scroll-smooth"
          >
            {products.map((product) => (
              <div key={product.id} className="min-w-[280px] md:min-w-[300px] snap-center h-full flex-shrink-0">
                <VerticalProductCard product={product} />
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
