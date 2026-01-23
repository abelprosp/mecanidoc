"use client";

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

interface CategoryHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
}

export default function CategoryHero({ title, subtitle, image }: CategoryHeroProps) {
  const [dimensions, setDimensions] = useState({
    widths: [] as string[],
    heights: [] as string[],
    diameters: [] as string[],
    loads: [] as string[],
    speeds: [] as string[]
  });
  
  const [selected, setSelected] = useState({
    width: '',
    height: '',
    diameter: '',
    load: '',
    speed: ''
  });

  const supabase = createClient();

  useEffect(() => {
    const fetchDimensions = async () => {
      const { data } = await supabase
        .from('products')
        .select('specs')
        .not('specs', 'is', null);

      if (data) {
        const widths = new Set<string>();
        const heights = new Set<string>();
        const diameters = new Set<string>();
        const loads = new Set<string>();
        const speeds = new Set<string>();

        data.forEach((item: any) => {
          if (item.specs) {
            if (item.specs.width) widths.add(item.specs.width);
            if (item.specs.height) heights.add(item.specs.height);
            if (item.specs.diameter) diameters.add(item.specs.diameter);
            if (item.specs.load_index) loads.add(item.specs.load_index);
            if (item.specs.speed_index) speeds.add(item.specs.speed_index);
          }
        });

        setDimensions({
          widths: Array.from(widths).sort((a, b) => Number(a) - Number(b)),
          heights: Array.from(heights).sort((a, b) => Number(a) - Number(b)),
          diameters: Array.from(diameters).sort((a, b) => Number(a) - Number(b)),
          loads: Array.from(loads).sort(),
          speeds: Array.from(speeds).sort()
        });
      }
    };

    fetchDimensions();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selected.width) params.set('width', selected.width);
    if (selected.height) params.set('height', selected.height);
    if (selected.diameter) params.set('diameter', selected.diameter);
    
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <section className="relative bg-gray-900 text-white py-8 md:py-16 mb-4 md:mb-8 md:rounded-2xl overflow-hidden shadow-sm md:mx-4">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={image || "https://images.unsplash.com/photo-1578844251758-2f71da645217?q=80&w=2071&auto=format&fit=crop"} 
          alt={title} 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
      </div>

      <div className="md:container md:mx-auto md:px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && <p className="text-lg text-gray-300 mb-8">{subtitle}</p>}

          {/* Search Box */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 mt-8">
            <h3 className="text-sm font-bold uppercase mb-4 tracking-wide text-gray-200">Recherchez des pneus</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Largeur</label>
                <select 
                  className="bg-white text-gray-900 text-sm p-2 rounded border-none focus:ring-2 focus:ring-blue-500"
                  value={selected.width}
                  onChange={(e) => setSelected({...selected, width: e.target.value})}
                >
                  <option value="">Largeur</option>
                  {dimensions.widths.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Hauteur</label>
                <select 
                  className="bg-white text-gray-900 text-sm p-2 rounded border-none focus:ring-2 focus:ring-blue-500"
                  value={selected.height}
                  onChange={(e) => setSelected({...selected, height: e.target.value})}
                >
                  <option value="">Hauteur</option>
                  {dimensions.heights.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Diamètre</label>
                <select 
                  className="bg-white text-gray-900 text-sm p-2 rounded border-none focus:ring-2 focus:ring-blue-500"
                  value={selected.diameter}
                  onChange={(e) => setSelected({...selected, diameter: e.target.value})}
                >
                  <option value="">Diamètre</option>
                  {dimensions.diameters.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Charge</label>
                <select 
                  className="bg-white text-gray-900 text-sm p-2 rounded border-none focus:ring-2 focus:ring-blue-500"
                  value={selected.load}
                  onChange={(e) => setSelected({...selected, load: e.target.value})}
                >
                  <option value="">Charge</option>
                  {dimensions.loads.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Vitesse</label>
                <select 
                  className="bg-white text-gray-900 text-sm p-2 rounded border-none focus:ring-2 focus:ring-blue-500"
                  value={selected.speed}
                  onChange={(e) => setSelected({...selected, speed: e.target.value})}
                >
                  <option value="">Vitesse</option>
                  {dimensions.speeds.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full bg-[#0066CC] hover:bg-blue-600 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Sélectionnez tous les attributs requis
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
