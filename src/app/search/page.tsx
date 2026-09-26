"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { ChevronDown, Filter, Loader2, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';

type Facets = {
  widths: string[];
  heights: string[];
  diameters: string[];
  brands: Array<{ id: string | null; name: string }>;
};

type SearchResponse = {
  items: Array<Record<string, unknown> & { id: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: Facets;
};

const EMPTY_FACETS: Facets = { widths: [], heights: [], diameters: [], brands: [] };

/** Parâmetros de URL que a pesquisa entende (fonte de verdade = URL). */
const FILTER_KEYS = ['category', 'width', 'height', 'diameter', 'brand', 'season', 'q', 'load_index', 'speed_index', 'pa_tipo', 'price_min', 'price_max', 'sort', 'page', 'product_ids', 'promo_id'] as const;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: searchParams.get('price_min') || '', max: searchParams.get('price_max') || '' });
  const [promoBanner, setPromoBanner] = useState<{ title: string; discount_text?: string | null; description?: string | null } | null>(null);

  const get = useCallback((k: string) => searchParams.get(k) || '', [searchParams]);
  const category = get('category') || 'Toutes';
  const season = get('season') || 'Tous';
  const page = Math.max(1, Number.parseInt(get('page') || '1', 10) || 1);
  const promoProductIds = useMemo(() => get('product_ids').split(',').map((s) => s.trim()).filter(Boolean), [get]);
  const promoId = get('promo_id');

  /** Atualiza a URL (e portanto a pesquisa). `page` volta a 1 salvo indicação em contrário. */
  const updateParams = useCallback(
    (changes: Record<string, string | null>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(changes)) {
        const isDefault = (k === 'category' && v === 'Toutes') || (k === 'season' && v === 'Tous');
        if (v === null || v === '' || isDefault) next.delete(k);
        else next.set(k, v);
      }
      if (!opts.keepPage) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    },
    [router, searchParams]
  );

  // Pesquisa no servidor sempre que a URL muda
  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k);
      if (v) qs.set(k, v);
    }
    setLoading(true);
    setError(null);
    fetch(`/api/products/search?${qs.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as SearchResponse;
      })
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        console.error('search:', e);
        setError('La recherche est momentanément indisponible. Veuillez réessayer.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [searchParams]);

  // Sincroniza rascunho de preço quando a URL muda externamente
  useEffect(() => {
    setPriceDraft({ min: searchParams.get('price_min') || '', max: searchParams.get('price_max') || '' });
  }, [searchParams]);

  // Banner de promoção
  useEffect(() => {
    if (!promoId.trim()) {
      setPromoBanner(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data, error: err } = await supabase
        .from('promotions')
        .select('title, discount_text, description')
        .eq('id', promoId.trim())
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setPromoBanner({ title: 'Offre promotionnelle' });
        return;
      }
      setPromoBanner({ title: data.title, discount_text: data.discount_text, description: data.description });
    })();
    return () => {
      cancelled = true;
    };
  }, [promoId]);

  const dismissPromoBanner = () => {
    updateParams({ promo_id: null, product_ids: null });
    setPromoBanner(null);
  };

  const applyPrice = () => {
    updateParams({ price_min: priceDraft.min.trim() || null, price_max: priceDraft.max.trim() || null });
  };

  const goToPage = (p: number) => {
    updateParams({ page: p > 1 ? String(p) : null }, { keepPage: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const facets = result?.facets ?? EMPTY_FACETS;
  const products = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const activeChips: Array<{ key: string; label: string }> = [];
  if (get('brand')) activeChips.push({ key: 'brand', label: get('brand') });
  if (get('width')) activeChips.push({ key: 'width', label: `Largeur ${get('width')}` });
  if (get('height')) activeChips.push({ key: 'height', label: `Hauteur ${get('height')}` });
  if (get('diameter')) activeChips.push({ key: 'diameter', label: `R${get('diameter')}` });
  if (get('load_index')) activeChips.push({ key: 'load_index', label: `Charge ${get('load_index')}` });
  if (get('speed_index')) activeChips.push({ key: 'speed_index', label: `Vitesse ${get('speed_index')}` });
  if (get('pa_tipo')) activeChips.push({ key: 'pa_tipo', label: get('pa_tipo') });
  if (get('q')) activeChips.push({ key: 'q', label: `« ${get('q')} »` });
  if (get('price_min') || get('price_max')) activeChips.push({ key: 'price', label: `${get('price_min') || '0'} € – ${get('price_max') || '∞'} €` });

  const removeChip = (key: string) => {
    if (key === 'price') updateParams({ price_min: null, price_max: null });
    else if (key === 'width') updateParams({ width: null, height: null, diameter: null });
    else if (key === 'height') updateParams({ height: null, diameter: null });
    else updateParams({ [key]: null });
  };

  const selectClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';

  return (
    <div className="layout-container py-4 md:py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <button
            type="button"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full flex items-center justify-between md:pointer-events-none mb-4"
            aria-expanded={isFiltersExpanded}
            aria-controls="search-filters"
          >
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Filter size={18} aria-hidden /> Filtres
            </h2>
            <div className="md:hidden">
              {isFiltersExpanded ? <ChevronUp size={20} className="text-gray-600" aria-hidden /> : <ChevronDown size={20} className="text-gray-600" aria-hidden />}
            </div>
          </button>

          <div id="search-filters" className={`space-y-4 ${isFiltersExpanded ? 'block' : 'hidden md:block'}`}>
            <div>
              <label htmlFor="f-category" className="text-xs font-bold text-gray-600 mb-1 block">Catégorie :</label>
              <div className="relative">
                <select
                  id="f-category"
                  value={category}
                  onChange={(e) => updateParams({ category: e.target.value, width: null, height: null, diameter: null, brand: null, load_index: null, speed_index: null, pa_tipo: null })}
                  className={selectClass}
                >
                  <option value="Toutes">Toutes</option>
                  <option value="Auto">Auto</option>
                  <option value="Moto">Moto</option>
                  <option value="Camion">Camion</option>
                  <option value="Tracteurs">Tracteurs</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" aria-hidden />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-2 block uppercase">Dimensions</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="f-width" className="text-xs text-gray-500 mb-1 block">Largeur</label>
                  <select id="f-width" value={get('width')} onChange={(e) => updateParams({ width: e.target.value, height: null, diameter: null })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
                    <option value="">--</option>
                    {facets.widths.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-height" className="text-xs text-gray-500 mb-1 block">Hauteur</label>
                  <select id="f-height" value={get('height')} disabled={!get('width')} onChange={(e) => updateParams({ height: e.target.value, diameter: null })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100">
                    <option value="">--</option>
                    {facets.heights.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-diameter" className="text-xs text-gray-500 mb-1 block">Diamètre</label>
                  <select id="f-diameter" value={get('diameter')} disabled={!get('height')} onChange={(e) => updateParams({ diameter: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100">
                    <option value="">--</option>
                    {facets.diameters.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="f-brand" className="text-xs font-bold text-gray-600 mb-1 block">Marque :</label>
              <div className="relative">
                <select id="f-brand" value={get('brand')} onChange={(e) => updateParams({ brand: e.target.value })} className={selectClass}>
                  <option value="">--</option>
                  {facets.brands.map((b) => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" aria-hidden />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-1 block">Prix (HT) :</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyPrice();
                }}
              >
                <input type="number" min={0} inputMode="decimal" aria-label="Prix minimum" placeholder="€ Min" value={priceDraft.min} onChange={(e) => setPriceDraft({ ...priceDraft, min: e.target.value })} onBlur={applyPrice} className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                <input type="number" min={0} inputMode="decimal" aria-label="Prix maximum" placeholder="€ Max" value={priceDraft.max} onChange={(e) => setPriceDraft({ ...priceDraft, max: e.target.value })} onBlur={applyPrice} className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                <button type="submit" className="sr-only">Appliquer</button>
              </form>
            </div>

            <div>
              <label htmlFor="f-season" className="text-xs font-bold text-gray-600 mb-1 block">Saison :</label>
              <div className="relative">
                <select id="f-season" value={season} onChange={(e) => updateParams({ season: e.target.value })} className={selectClass}>
                  <option value="Tous">Toutes</option>
                  <option value="Été">Été</option>
                  <option value="Hiver">Hiver</option>
                  <option value="4 Saisons">4 Saisons</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        {promoBanner && (
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#0066CC]/25 bg-[#0066CC]/8 px-4 py-3 text-sm text-gray-900">
            <div className="min-w-0">
              <p className="font-bold text-[#0066CC]">Promotion</p>
              <p className="mt-0.5 font-semibold text-gray-900">{promoBanner.title}</p>
              {promoBanner.discount_text ? <p className="mt-1 text-base font-bold text-gray-800">{promoBanner.discount_text}</p> : null}
              {promoBanner.description ? <p className="mt-1 text-gray-600 leading-snug">{promoBanner.description}</p> : null}
            </div>
            <button type="button" onClick={dismissPromoBanner} className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Fermer
            </button>
          </div>
        )}
        {promoProductIds.length > 0 && (
          <div className="mb-4 rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            Filtre promo actif : {promoProductIds.length} produit(s) sélectionné(s) dans cette offre.
          </div>
        )}

        <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">
            Résultats de recherche
            {get('brand') && <span className="text-[#0066CC]"> {get('brand')}</span>}
            {get('width') && <span className="text-gray-500 text-sm ml-2">({get('width')}{get('height') ? `/${get('height')}` : ''}{get('diameter') ? ` R${get('diameter')}` : ''})</span>}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" aria-live="polite">{loading ? 'Recherche…' : `${total} produit${total > 1 ? 's' : ''}`}</span>
            <label className="sr-only" htmlFor="f-sort">Trier</label>
            <select id="f-sort" value={get('sort') || 'relevance'} onChange={(e) => updateParams({ sort: e.target.value === 'relevance' ? null : e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
              <option value="relevance">Pertinence</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="name_asc">Nom A–Z</option>
            </select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <button key={c.key} type="button" onClick={() => removeChip(c.key)} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50" aria-label={`Retirer le filtre ${c.label}`}>
                {c.label} <X size={12} aria-hidden />
              </button>
            ))}
            <button type="button" onClick={() => router.replace(category !== 'Toutes' ? `/search?category=${encodeURIComponent(category)}` : '/search')} className="text-xs text-[#0066CC] hover:underline px-2">
              Tout effacer
            </button>
          </div>
        )}

        {error ? (
          <div className="bg-white rounded-lg p-12 text-center text-red-600" role="alert">{error}</div>
        ) : loading && !result ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={48} aria-label="Chargement" /></div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-gray-500">
            <p className="font-medium text-gray-700 mb-2">Aucun produit ne correspond à votre recherche.</p>
            <p className="text-sm">Essayez d&apos;élargir les dimensions ou de retirer un filtre.</p>
          </div>
        ) : (
          <div className={`flex flex-col gap-6 ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
            {products.map((product) => (
              <div key={product.id} className="w-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-40">
              <ChevronLeft size={16} aria-hidden /> Précédent
            </button>
            <span className="text-sm text-gray-600 px-2">Page {page} / {totalPages}</span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-40">
              Suivant <ChevronRight size={16} aria-hidden />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" aria-label="Chargement" /></div>}>
        <SearchContent />
      </Suspense>
      <Footer />
    </main>
  );
}
