"use client";

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { ChevronDown, Filter, Loader2, ChevronUp } from 'lucide-react';

/** Valor esperado na coluna `products.category` (a UI / URL usam "Tracteurs", a BD costuma usar "Tracteur"). */
function dbCategoryFromUi(uiCategory: string): string | null {
  if (!uiCategory || uiCategory === 'Toutes') return null;
  if (uiCategory === 'Tracteurs') return 'Tracteur';
  return uiCategory;
}

/** Aplica filtro de categoria de forma compatível com a BD (maiúsculas e Tracteur/Tracteurs). */
function applyCategoryToQuery(query: any, uiCategory: string) {
  const cat = dbCategoryFromUi(uiCategory);
  if (!cat) return query;
  if (cat === 'Tracteur') {
    return query.or('category.ilike.Tracteur,category.ilike.Tracteurs');
  }
  return query.ilike('category', cat);
}

function productMatchesUiCategory(productCategory: string | null | undefined, uiCategory: string): boolean {
  const want = dbCategoryFromUi(uiCategory);
  if (!want) return true;
  const p = (productCategory || '').trim().toLowerCase();
  const w = want.toLowerCase();
  if (p === w) return true;
  if (w === 'tracteur' && (p === 'tracteurs' || p.startsWith('tracteur'))) return true;
  return false;
}

type SpecsFilterSlice = {
  width: string;
  height: string;
  diameter: string;
  load_index: string;
  speed_index: string;
  season: string;
};

/**
 * Filtros em `specs`: `.contains` no JSONB exige tipos iguais (número ≠ string).
 * O CSV/Postgres costuma guardar width/height/diameter como número; o <select> envia string → 0 resultados.
 * `specs->>chave` compara em texto e alinha os dois casos.
 */
function applySpecsFieldFilters(query: any, f: SpecsFilterSlice) {
  let q = query;
  const t = (s: string) => String(s).trim();
  if (f.width) q = q.eq('specs->>width', t(f.width));
  if (f.height) q = q.eq('specs->>height', t(f.height));
  if (f.diameter) q = q.eq('specs->>diameter', t(f.diameter));
  if (f.load_index) q = q.eq('specs->>load_index', t(f.load_index));
  if (f.speed_index) q = q.eq('specs->>speed_index', t(f.speed_index));
  if (f.season && f.season !== 'Tous') q = q.eq('specs->>season', f.season);
  return q;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [dimensionSpecs, setDimensionSpecs] = useState<any[]>([]);
  const [brandList, setBrandList] = useState<{ id: string | null; name: string }[]>([]);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'Toutes',
    width: searchParams.get('width') || '',
    height: searchParams.get('height') || '',
    diameter: searchParams.get('diameter') || '',
    brand: searchParams.get('brand') || '',
    season: searchParams.get('season') || 'Tous',
    searchQuery: searchParams.get('q') || '',
    load_index: searchParams.get('load_index') || '',
    speed_index: searchParams.get('speed_index') || '',
  });

  useEffect(() => {
    const fetchDimensionSpecs = async () => {
      let q = supabase
        .from('products')
        .select('specs')
        .not('specs', 'is', null)
        .eq('is_active', true);
      q = applyCategoryToQuery(q, filters.category);
      const { data } = await q;
      if (data) {
        const valid = data.map((r: any) => r.specs).filter((s: any) => s && s.width);
        setDimensionSpecs(valid);
      }
    };
    fetchDimensionSpecs();
  }, [filters.category]);

  useEffect(() => {
    const fetchBrands = async () => {
      let q = supabase
        .from('products')
        .select('brand_id, brand, brands(id, name)')
        .eq('is_active', true);
      q = applyCategoryToQuery(q, filters.category);
      const { data } = await q;
      if (data) {
        const seen = new Set<string>();
        const list: { id: string | null; name: string }[] = [];
        data.forEach((p: any) => {
          const name = (p.brands?.name || p.brand || '').trim();
          if (!name) return;
          const key = p.brand_id || name;
          if (seen.has(key)) return;
          seen.add(key);
          list.push({ id: p.brands?.id || p.brand_id || null, name });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setBrandList(list);
      }
    };
    fetchBrands();
  }, [filters.category]);

  const availableWidths = useMemo(() => {
    const w = new Set(dimensionSpecs.map(s => s.width).filter(Boolean));
    return Array.from(w).sort((a, b) => Number(a) - Number(b));
  }, [dimensionSpecs]);

  const availableHeights = useMemo(() => {
    if (!filters.width) return [];
    const h = new Set(dimensionSpecs.filter(s => s.width === filters.width).map(s => s.height).filter(Boolean));
    return Array.from(h).sort((a, b) => Number(a) - Number(b));
  }, [dimensionSpecs, filters.width]);

  const availableDiameters = useMemo(() => {
    if (!filters.width || !filters.height) return [];
    const d = new Set(dimensionSpecs.filter(s => s.width === filters.width && s.height === filters.height).map(s => s.diameter).filter(Boolean));
    return Array.from(d).sort((a, b) => Number(a) - Number(b));
  }, [dimensionSpecs, filters.width, filters.height]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      // Se houver filtro de marca, buscar primeiro o ID da marca
      let brandId: string | null = null;
      if (filters.brand) {
        const brandName = filters.brand.trim();
        console.log('Buscando marca:', brandName);
        
        // Tentar busca exata primeiro
        let { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, name')
          .ilike('name', brandName)
          .limit(1)
          .maybeSingle();
        
        console.log('Busca exata:', brandData, brandError);
        
        // Se não encontrou, tentar busca parcial
        if (!brandData) {
          const { data: partialMatch, error: partialError } = await supabase
            .from('brands')
            .select('id, name')
            .ilike('name', `%${brandName}%`)
            .limit(1)
            .maybeSingle();
          brandData = partialMatch;
          console.log('Busca parcial:', partialMatch, partialError);
        }
        
        if (brandData) {
          brandId = brandData.id;
          console.log('Marca encontrada, ID:', brandId);
        } else {
          console.log('Marca não encontrada na tabela brands');
        }
      }
      
      let query = supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .eq('is_active', true);

      // Apply Search Query (busca geral por qualquer atributo)
      if (filters.searchQuery && filters.searchQuery.trim().length >= 2) {
        const searchTerm = filters.searchQuery.trim().toLowerCase();
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,pa_tipo.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      query = applyCategoryToQuery(query, filters.category);
      query = applySpecsFieldFilters(query, filters);

      let data: any[] = [];
      let error: any = null;

      // Se houver filtro de marca, fazer buscas e combinar
      if (filters.brand) {
        const brandName = filters.brand.trim();
        console.log('Aplicando filtro de marca:', { brandName, brandId });
        
        const results: any[] = [];
        
        // Primeiro, fazer buscas de teste SEM filtros para diagnosticar
        if (brandId) {
          const { data: testData } = await supabase
            .from('products')
            .select('id, brand_id, brand, category, is_active')
            .eq('brand_id', brandId)
            .limit(10);
          console.log('🔍 Teste brand_id (sem outros filtros):', testData?.length || 0);
          if (testData && testData.length > 0) {
            console.log('Exemplo produto:', testData[0]);
          }
        }
        
        const { data: testData2 } = await supabase
          .from('products')
          .select('id, brand_id, brand, category, is_active')
          .ilike('brand', `%${brandName}%`)
          .limit(10);
        console.log('🔍 Teste brand texto (sem outros filtros):', testData2?.length || 0);
        if (testData2 && testData2.length > 0) {
          console.log('Exemplo produto:', testData2[0]);
        }
        
        // Se encontrou produtos nos testes, usar esses resultados também
        if (testData2 && testData2.length > 0) {
          // Buscar os produtos completos
          const productIds = testData2.map(p => p.id);
          const { data: fullProducts } = await supabase
            .from('products')
            .select('*, brands(id, name, logo_url)')
            .in('id', productIds)
            .eq('is_active', true);
          
          if (fullProducts) {
            // Aplicar filtro de categoria no resultado se necessário
            let filtered = fullProducts;
            if (filters.category && filters.category !== 'Toutes') {
              filtered = fullProducts.filter((p) =>
                productMatchesUiCategory(p.category, filters.category)
              );
            }
            console.log('Produtos encontrados por brand texto (após filtro categoria):', filtered.length);
            results.push(...filtered);
          }
        }
        
        // Busca 1: Por brand_id se existir
        if (brandId) {
          let query1 = supabase
            .from('products')
            .select('*, brands(id, name, logo_url)')
            .eq('is_active', true)
            .eq('brand_id', brandId);
          
          query1 = applyCategoryToQuery(query1, filters.category);
          query1 = applySpecsFieldFilters(query1, filters);
          
          const { data: data1, error: error1 } = await query1;
          console.log('Busca por brand_id:', data1?.length || 0, error1);
          if (data1 && data1.length > 0) {
            console.log('Primeiro produto encontrado por brand_id:', data1[0]);
            results.push(...data1);
          }
          if (error1) {
            console.error('Erro na busca por brand_id:', error1);
            error = error1;
          }
        }
        
        // Busca 2: Por brand texto (sempre fazer esta busca também)
        let query2 = supabase
          .from('products')
          .select('*, brands(id, name, logo_url)')
          .eq('is_active', true)
          .ilike('brand', `%${brandName}%`);
        
        query2 = applyCategoryToQuery(query2, filters.category);
        query2 = applySpecsFieldFilters(query2, filters);
        
        const { data: data2, error: error2 } = await query2;
        console.log('Busca por brand texto:', data2?.length || 0, error2);
        if (data2 && data2.length > 0) {
          console.log('Primeiro produto encontrado por brand texto:', data2[0]);
          results.push(...data2);
        }
        if (error2) {
          console.error('Erro na busca por brand texto:', error2);
          error = error2;
        }
        
        // Combinar resultados, remover duplicatas e garantir categoria (caminho marca é complexo)
        let uniqueProducts = results.filter((product, index, self) => 
          index === self.findIndex((p) => p.id === product.id)
        );
        if (filters.category && filters.category !== 'Toutes') {
          uniqueProducts = uniqueProducts.filter((p) =>
            productMatchesUiCategory(p.category, filters.category)
          );
        }
        data = uniqueProducts;
        console.log('Total único após combinar:', data.length);
      } else {
        // Sem filtro de marca, busca normal
        const result = await query;
        let rows = result.data || [];
        if (filters.category && filters.category !== 'Toutes') {
          rows = rows.filter((p) => productMatchesUiCategory(p.category, filters.category));
        }
        data = rows;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        console.log('Produtos encontrados:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('Primeiro produto:', data[0]);
        }
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [filters, searchParams]); // Re-run when filters or URL params change

  // Update filters when URL params change (e.g. from Hero)
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    const qParam = searchParams.get('q');
    setFilters(prev => ({
      ...prev,
      category: searchParams.get('category') || 'Toutes',
      width: searchParams.get('width') || '',
      height: searchParams.get('height') || '',
      diameter: searchParams.get('diameter') || '',
      brand: searchParams.get('brand') || '',
      season: seasonParam !== null ? (seasonParam || 'Tous') : prev.season,
      load_index: searchParams.get('load_index') || '',
      speed_index: searchParams.get('speed_index') || '',
      searchQuery: qParam !== null ? qParam : prev.searchQuery,
    }));
  }, [searchParams]);

  return (
    <div className="md:container md:mx-auto md:px-4 py-4 md:py-8 flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          {/* Header com botão de expandir/colapsar no mobile */}
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full flex items-center justify-between md:pointer-events-none mb-4"
          >
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Filter size={18} /> Filtres
            </h2>
            {/* Ícone de expandir/colapsar - apenas visível no mobile */}
            <div className="md:hidden">
              {isFiltersExpanded ? (
                <ChevronUp size={20} className="text-gray-600" />
              ) : (
                <ChevronDown size={20} className="text-gray-600" />
              )}
            </div>
          </button>
          
          {/* Conteúdo dos filtros - colapsado no mobile por padrão */}
          <div className={`space-y-4 ${isFiltersExpanded ? 'block' : 'hidden md:block'}`}>
            {/* Category first – dimensions filtered by category */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Catégorie :</label>
              <div className="relative">
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value, width: '', height: '', diameter: '', brand: '', load_index: '', speed_index: ''})}
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

            {/* Dimensions Filter (by category) */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase">Dimensions</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Largeur</label>
                  <select 
                    value={filters.width}
                    onChange={(e) => setFilters({...filters, width: e.target.value, height: '', diameter: ''})}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">--</option>
                    {availableWidths.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Hauteur</label>
                  <select 
                    value={filters.height}
                    onChange={(e) => setFilters({...filters, height: e.target.value, diameter: ''})}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">--</option>
                    {availableHeights.map(h => <option key={h} value={h}>{h}</option>)}
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
                    {availableDiameters.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Brand (if not in URL) – filtered by category */}
            {!searchParams.get('brand') && (
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Marque :</label>
                <div className="relative">
                  <select
                    value={filters.brand}
                    onChange={(e) => setFilters({...filters, brand: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white"
                  >
                    <option value="">--</option>
                    {brandList.map((b) => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
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
