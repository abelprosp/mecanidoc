"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import {
  applyCategoryToQuery,
  applyPaTipoToQuery,
  productMatchesUiCategory,
  productMatchesPaTipo,
} from '@/lib/product-query-helpers';

/** Compara medidas specs vindas da BD (número ou string) com o valor do <select> (string). */
function specDimEq(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

interface CategoryHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  category?: string;
  paTipo?: string | null;
}

export default function CategoryHero({ title, subtitle, image, category, paTipo }: CategoryHeroProps) {
  const [allSpecs, setAllSpecs] = useState<any[]>([]);
  const [selected, setSelected] = useState({
    width: '',
    height: '',
    diameter: '',
    load: '',
    speed: '',
    brand: ''
  });
  const [brandList, setBrandList] = useState<{ id: string | null; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchDimensions = async () => {
      let query = supabase
        .from('products')
        .select('specs, category, pa_tipo, brand_id, brand, brands(id, name)')
        .not('specs', 'is', null)
        .eq('is_active', true);

      query = applyCategoryToQuery(query, category?.trim() ? category : 'Toutes');
      query = applyPaTipoToQuery(query, paTipo);

      const { data } = await query;

      if (data) {
        const uiCat = category?.trim() ? category.trim() : 'Toutes';
        const rows = data.filter(
          (item: any) =>
            productMatchesUiCategory(item.category, uiCat) &&
            productMatchesPaTipo(item.pa_tipo, paTipo || '')
        );
        const validSpecs = rows
          .map((item: any) => item.specs)
          .filter((spec: any) => spec && spec.width);
        setAllSpecs(validSpecs);
        const seen = new Set<string>();
        const list: { id: string | null; name: string }[] = [];
        rows.forEach((p: any) => {
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

    fetchDimensions();
  }, [category, paTipo]);

  useEffect(() => {
    setSelected({ width: '', height: '', diameter: '', load: '', speed: '', brand: '' });
  }, [category, paTipo]);

  const availableWidths = useMemo(() => {
    const widths = new Set(
      allSpecs.map((s) => s.width).filter((w) => w !== '' && w != null).map((w) => String(w).trim())
    );
    return Array.from(widths).sort((a, b) => Number(a) - Number(b));
  }, [allSpecs]);

  const availableHeights = useMemo(() => {
    if (!selected.width) return [];
    const heights = new Set(
      allSpecs
        .filter((s) => specDimEq(s.width, selected.width))
        .map((s) => s.height)
        .filter((h) => h !== '' && h != null)
        .map((h) => String(h).trim())
    );
    return Array.from(heights).sort((a, b) => Number(a) - Number(b));
  }, [allSpecs, selected.width]);

  const availableDiameters = useMemo(() => {
    if (!selected.width || !selected.height) return [];
    const diameters = new Set(
      allSpecs
        .filter(
          (s) => specDimEq(s.width, selected.width) && specDimEq(s.height, selected.height)
        )
        .map((s) => s.diameter)
        .filter((d) => d !== '' && d != null)
        .map((d) => String(d).trim())
    );
    return Array.from(diameters).sort((a, b) => Number(a) - Number(b));
  }, [allSpecs, selected.width, selected.height]);

  const availableLoads = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    const loads = new Set(
      allSpecs
        .filter(
          (s) =>
            specDimEq(s.width, selected.width) &&
            specDimEq(s.height, selected.height) &&
            specDimEq(s.diameter, selected.diameter)
        )
        .map((s) => s.load_index)
        .filter((l) => l !== '' && l != null)
        .map((l) => String(l).trim())
    );
    return Array.from(loads).sort((a, b) => a.localeCompare(b));
  }, [allSpecs, selected.width, selected.height, selected.diameter]);

  const availableSpeeds = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    const speeds = new Set(
      allSpecs
        .filter((s) => {
          const dimOk =
            specDimEq(s.width, selected.width) &&
            specDimEq(s.height, selected.height) &&
            specDimEq(s.diameter, selected.diameter);
          const loadOk = !selected.load || specDimEq(s.load_index, selected.load);
          return dimOk && loadOk;
        })
        .map((s) => s.speed_index)
        .filter((sp) => sp !== '' && sp != null)
        .map((sp) => String(sp).trim())
    );
    return Array.from(speeds).sort();
  }, [allSpecs, selected.width, selected.height, selected.diameter, selected.load]);

  const hasThreeDimensions =
    Boolean(selected.width?.trim() && selected.height?.trim() && selected.diameter?.trim());

  const handleSearch = () => {
    if (!hasThreeDimensions) return;
    const params = new URLSearchParams();
    if (selected.width) params.set('width', selected.width);
    if (selected.height) params.set('height', selected.height);
    if (selected.diameter) params.set('diameter', selected.diameter);
    if (selected.load) params.set('load_index', selected.load);
    if (selected.speed) params.set('speed_index', selected.speed);
    if (selected.brand) params.set('brand', selected.brand);
    if (category?.trim()) params.set('category', category.trim());
    if (paTipo?.trim()) params.set('pa_tipo', paTipo.trim());
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <section className="relative bg-gray-900 text-white py-5 md:py-10 mt-4 md:mt-6 mb-3 md:mb-6 rounded-2xl overflow-hidden shadow-sm w-full">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={image || "https://images.unsplash.com/photo-1578844251758-2f71da645217?q=80&w=2071&auto=format&fit=crop"} 
          alt={title} 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 px-0">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && <p className="text-lg text-gray-300 mb-4 md:mb-6">{subtitle}</p>}

          {/* Search Box */}
          <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20 mt-4 md:mt-6 overflow-x-hidden">
            <h3 className="text-sm font-bold uppercase mb-3 md:mb-4 tracking-wide text-gray-200">Recherchez des pneus</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3 mb-4">
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Largeur</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.width}
                  onChange={(e) => setSelected({...selected, width: e.target.value, height: '', diameter: '', load: '', speed: ''})}
                >
                  <option value="">Largeur</option>
                  {availableWidths.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Hauteur</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.height}
                  onChange={(e) => setSelected({...selected, height: e.target.value, diameter: '', load: '', speed: ''})}
                >
                  <option value="">Hauteur</option>
                  {availableHeights.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Diamètre</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.diameter}
                  onChange={(e) => setSelected({...selected, diameter: e.target.value, load: '', speed: ''})}
                >
                  <option value="">Diamètre</option>
                  {availableDiameters.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Charge</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.load}
                  onChange={(e) => setSelected({...selected, load: e.target.value, speed: ''})}
                >
                  <option value="">Charge</option>
                  {availableLoads.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Vitesse</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.speed}
                  onChange={(e) => setSelected({...selected, speed: e.target.value})}
                >
                  <option value="">Vitesse</option>
                  {availableSpeeds.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col w-full min-w-0">
                <label className="text-xs md:text-[10px] text-gray-400 mb-2 md:mb-1 uppercase font-bold">Marque</label>
                <select 
                  className="w-full bg-white text-gray-900 text-base md:text-sm px-2 py-3 md:p-2 rounded border-none focus:ring-2 focus:ring-blue-500 min-h-[48px] md:min-h-0"
                  value={selected.brand}
                  onChange={(e) => setSelected({...selected, brand: e.target.value})}
                >
                  <option value="">Marque</option>
                  {brandList.map((b) => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={!hasThreeDimensions}
              onClick={handleSearch}
              className={`w-full font-bold py-3 rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                hasThreeDimensions
                  ? 'bg-[#0066CC] hover:bg-blue-600 text-white cursor-pointer'
                  : 'bg-[#99A1AF] text-white/95 cursor-not-allowed opacity-90'
              }`}
            >
              <Search size={20} />
              {hasThreeDimensions ? 'Rechercher' : 'Sélectionnez largeur, hauteur et diamètre'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
