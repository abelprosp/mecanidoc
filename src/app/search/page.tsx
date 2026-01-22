"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { ChevronDown, Filter, Loader2 } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'Toutes',
    width: searchParams.get('width') || '',
    height: searchParams.get('height') || '',
    diameter: searchParams.get('diameter') || '',
    brand: searchParams.get('brand') || '',
    season: searchParams.get('season') || 'Tous',
  });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*, brands(logo_url)')
        .eq('is_active', true);

      // Apply Filters
      if (filters.category && filters.category !== 'Toutes') {
        query = query.eq('category', filters.category.toLowerCase());
      }
      if (filters.brand) {
        // Case insensitive search for brand name
        query = query.ilike('brand', `%${filters.brand}%`);
      }
      
      // JSONB Filters for specs
      if (filters.width) {
        query = query.contains('specs', { width: filters.width });
      }
      if (filters.height) {
        query = query.contains('specs', { height: filters.height });
      }
      if (filters.diameter) {
        query = query.contains('specs', { diameter: filters.diameter });
      }
      if (filters.season && filters.season !== 'Tous') {
        query = query.contains('specs', { season: filters.season });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [filters, searchParams]); // Re-run when filters or URL params change

  // Update filters when URL params change (e.g. from Hero)
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: searchParams.get('category') || 'Toutes',
      width: searchParams.get('width') || '',
      height: searchParams.get('height') || '',
      diameter: searchParams.get('diameter') || '',
      brand: searchParams.get('brand') || '',
    }));
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Filter size={18} /> Filtres
          </h2>
          
          <div className="space-y-4">
            {/* Dimensions Filter (Like Homepage) */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase">Dimensions</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Largeur</label>
                  <select 
                    value={filters.width}
                    onChange={(e) => setFilters({...filters, width: e.target.value})}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">--</option>
                    {/* Ideally populate dynamically */}
                    <option value="205">205</option>
                    <option value="225">225</option>
                    <option value="275">275</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Hauteur</label>
                  <select 
                    value={filters.height}
                    onChange={(e) => setFilters({...filters, height: e.target.value})}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">--</option>
                    <option value="45">45</option>
                    <option value="55">55</option>
                    <option value="60">60</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Diamètre</label>
                  <select 
                    value={filters.diameter}
                    onChange={(e) => setFilters({...filters, diameter: e.target.value})}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">--</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Catégorie :</label>
              <div className="relative">
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white"
                >
                  <option value="Toutes">Toutes</option>
                  <option value="Auto">Auto</option>
                  <option value="Moto">Moto</option>
                  <option value="Camion">Camion</option>
                  <option value="Tracteurs">Tracteurs</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Brand (if not in URL) */}
            {!searchParams.get('brand') && (
               <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Marque :</label>
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  onChange={(e) => setFilters({...filters, brand: e.target.value})}
                />
              </div>
            )}

            {/* Price Range (Mock UI) */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Prix :</label>
              <div className="flex gap-2">
                <input type="number" placeholder="€ Min" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                <input type="number" placeholder="€ Max" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
              </div>
            </div>

            {/* Season */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Clima :</label>
              <div className="relative">
                <select 
                  value={filters.season}
                  onChange={(e) => setFilters({...filters, season: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white"
                >
                  <option value="Tous">Tous</option>
                  <option value="Été">Été</option>
                  <option value="Hiver">Hiver</option>
                  <option value="4 Saisons">4 Saisons</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* Product Grid */}
      <div className="flex-1">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            Résultats de recherche 
            {filters.brand && <span className="text-[#0066CC]"> {filters.brand}</span>}
            {filters.width && <span className="text-gray-500 text-sm ml-2">({filters.width}/{filters.height} R{filters.diameter})</span>}
          </h1>
          <span className="text-sm text-gray-500">{products.length} produits trouvés</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" size={48} />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">
            Aucun produit ne correspond à votre recherche.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {products.map((product) => (
              <div key={product.id} className="w-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}>
        <SearchContent />
      </Suspense>
      <Footer />
    </main>
  );
}
