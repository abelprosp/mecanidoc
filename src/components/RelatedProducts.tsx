"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ product_id: productId });
    if (category) params.set('category', category);
    if (brandId) params.set('brand_id', brandId);
    else if (brandName) params.set('brand', brandName);
    if (specs?.width) params.set('width', specs.width);
    if (specs?.height) params.set('height', specs.height);
    if (specs?.diameter) params.set('diameter', specs.diameter);

    setLoading(true);
    fetch(`/api/products/related?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setProducts(Array.isArray(json.items) ? json.items : []);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Error fetching related products:', error);
          setProducts([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
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
        <div className="layout-container flex justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 bg-transparent relative group">
      <div className="layout-container">
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
