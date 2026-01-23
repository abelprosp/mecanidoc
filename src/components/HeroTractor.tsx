"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Car, Bike, Truck, Tractor, Sun, ChevronDown, CloudLightning, CloudSnow } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function HeroTractor() {
  const [allSpecs, setAllSpecs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchSpecs = async () => {
      const { data } = await supabase
        .from('products')
        .select('specs, category')
        .not('specs', 'is', null)
        .ilike('category', 'Tracteur'); // Filtrar apenas produtos da categoria Tracteur

      if (data) {
        const validSpecs = data
          .map((item: any) => item.specs)
          .filter((spec: any) => spec && spec.width);
        setAllSpecs(validSpecs);
      }
    };

    fetchSpecs();
  }, []);

  const [selected, setSelected] = useState({
    width: '',
    height: '',
    diameter: '',
    load: '',
    speed: '',
    season: ''
  });

  // Derived dimensions with cascading logic
  const availableWidths = useMemo(() => {
    const widths = new Set(allSpecs.map(s => s.width).filter(Boolean));
    return Array.from(widths).sort((a: any, b: any) => parseFloat(a) - parseFloat(b));
  }, [allSpecs]);

  const availableHeights = useMemo(() => {
    if (!selected.width) return [];
    const heights = new Set(
      allSpecs
        .filter(s => s.width === selected.width)
        .map(s => s.height)
        .filter(Boolean)
    );
    return Array.from(heights).sort((a: any, b: any) => parseFloat(a) - parseFloat(b));
  }, [allSpecs, selected.width]);

  const availableDiameters = useMemo(() => {
    if (!selected.width || !selected.height) return [];
    const diameters = new Set(
      allSpecs
        .filter(s => s.width === selected.width && s.height === selected.height)
        .map(s => s.diameter)
        .filter(Boolean)
    );
    return Array.from(diameters).sort((a: any, b: any) => parseFloat(a) - parseFloat(b));
  }, [allSpecs, selected.width, selected.height]);

  const availableLoads = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    const loads = new Set(
      allSpecs
        .filter(s => s.width === selected.width && s.height === selected.height && s.diameter === selected.diameter)
        .map(s => s.load_index)
        .filter(Boolean)
    );
    return Array.from(loads).sort((a: any, b: any) => parseFloat(a) - parseFloat(b));
  }, [allSpecs, selected.width, selected.height, selected.diameter]);

  const availableSpeeds = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    const speeds = new Set(
      allSpecs
        .filter(s => 
          s.width === selected.width && 
          s.height === selected.height && 
          s.diameter === selected.diameter && 
          (!selected.load || s.load_index === selected.load)
        )
        .map(s => s.speed_index)
        .filter(Boolean)
    );
    return Array.from(speeds).sort();
  }, [allSpecs, selected.width, selected.height, selected.diameter, selected.load]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('category', 'Tracteur');
    if (selected.width) params.set('width', selected.width);
    if (selected.height) params.set('height', selected.height);
    if (selected.diameter) params.set('diameter', selected.diameter);
    if (selected.load) params.set('load_index', selected.load);
    if (selected.speed) params.set('speed_index', selected.speed);
    if (selected.season) params.set('season', selected.season);
    
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <div className="md:container md:mx-auto md:px-4 py-4 md:py-8">
      <div className="relative bg-gray-900 h-auto md:h-[550px] md:rounded-[2.5rem] flex flex-col items-center justify-center text-white overflow-hidden shadow-2xl py-12 md:py-0">
        {/* Background Image - Tractor specific */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1595185966442-d621b1834927?q=80&w=2070&auto=format&fit=crop" 
            alt="Tractor Workshop Background" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-10 drop-shadow-lg leading-tight">
            Roulez en toute sécurité avec mecanidoc.com : parce que votre<br />
            sécurité est notre priorité
          </h1>

          {/* Search Widget Container */}
          <div className="w-full max-w-3xl">
            
            {/* Tabs */}
            <div className="flex flex-nowrap overflow-x-auto items-end pl-2 relative z-20 pb-1 scrollbar-hide w-full gap-[-1rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Inactive Tab: Auto */}
              <div className="flex-shrink-0 relative z-40 -mr-4">
                <Link href="/">
                  <div className="bg-[#E5E7EB] text-gray-600 px-2 py-2 md:px-10 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-medium transform skew-x-[20deg] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)] border-r border-gray-300">
                    <div className="transform -skew-x-[20deg] flex items-center gap-1 md:gap-2">
                      <Car className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      <span className="text-[10px] md:text-base">Auto</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Inactive Tab: Moto */}
              <div className="flex-shrink-0 relative z-30 -mr-4">
                <Link href="/moto">
                  <div className="bg-[#E5E7EB] text-gray-600 px-2 py-2 md:px-8 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-medium transform skew-x-[20deg] hover:bg-gray-300 transition-colors cursor-pointer border-r border-gray-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)]">
                    <div className="transform -skew-x-[20deg] flex items-center gap-1 md:gap-2">
                      <Bike className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      <span className="text-[10px] md:text-base">Moto</span>
                    </div>
                  </div>
                </Link>
              </div>

               {/* Inactive Tab: Camion */}
               <div className="flex-shrink-0 relative z-20 -mr-4">
                <Link href="/camion">
                  <div className="bg-[#E5E7EB] text-gray-600 px-2 py-2 md:px-8 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-medium transform skew-x-[20deg] hover:bg-gray-300 transition-colors cursor-pointer border-r border-gray-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)]">
                    <div className="transform -skew-x-[20deg] flex items-center gap-1 md:gap-2">
                      <Truck className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      <span className="text-[10px] md:text-base">Camion</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Active Tab: Tracteurs */}
              <div className="flex-shrink-0 relative z-50">
                <Link href="/tracteurs">
                  <div className="bg-white text-gray-800 px-2 py-2 md:px-8 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-bold transform skew-x-[20deg] shadow-[2px_-2px_5px_rgba(0,0,0,0.1)]">
                    <div className="transform -skew-x-[20deg] flex items-center gap-1 md:gap-2">
                      <Tractor className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      <span className="text-[10px] md:text-base">Tracteurs</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="bg-white rounded-b-xl rounded-tr-xl shadow-2xl p-4 md:p-6 text-gray-800 relative z-30 mt-[-1px]">
              
              {/* Inner Frame */}
              <div className="border border-gray-100 rounded-xl p-4 md:p-6">
                
                {/* Dropdowns Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">Largeur</label>
                    <div className="relative">
                      <select 
                        value={selected.width}
                        onChange={(e) => setSelected({
                          ...selected, 
                          width: e.target.value,
                          height: '',
                          diameter: '',
                          load: '',
                          speed: ''
                        })}
                        className="w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="">Largeur</option>
                        {availableWidths.map((w: any) => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">Hauteur</label>
                    <div className="relative">
                      <select 
                        value={selected.height}
                        disabled={!selected.width}
                        onChange={(e) => setSelected({
                          ...selected, 
                          height: e.target.value,
                          diameter: '',
                          load: '',
                          speed: ''
                        })}
                        className={`w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 ${!selected.width ? 'bg-gray-100' : 'bg-white'}`}
                      >
                        <option value="">Hauteur</option>
                        {availableHeights.map((h: any) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">Diamètre</label>
                    <div className="relative">
                      <select 
                        value={selected.diameter}
                        disabled={!selected.height}
                        onChange={(e) => setSelected({
                          ...selected, 
                          diameter: e.target.value,
                          load: '',
                          speed: ''
                        })}
                        className={`w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 ${!selected.height ? 'bg-gray-100' : 'bg-white'}`}
                      >
                        <option value="">Diamètre</option>
                        {availableDiameters.map((d: any) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">Charge</label>
                    <div className="relative">
                      <select 
                        value={selected.load}
                        disabled={!selected.diameter}
                        onChange={(e) => setSelected({
                          ...selected, 
                          load: e.target.value,
                          speed: ''
                        })}
                        className={`w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 ${!selected.diameter ? 'bg-gray-100' : 'bg-white'}`}
                      >
                        <option value="">Charge</option>
                        {availableLoads.map((l: any) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">Vitesse</label>
                    <div className="relative">
                      <select 
                        value={selected.speed}
                        disabled={!selected.diameter}
                        onChange={(e) => setSelected({...selected, speed: e.target.value})}
                        className={`w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 ${!selected.diameter ? 'bg-gray-100' : 'bg-white'}`}
                      >
                        <option value="">Vitesse</option>
                        {availableSpeeds.map((s: any) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Seasons & Button */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Season Icons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelected({...selected, season: selected.season === 'ete' ? '' : 'ete'})}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${selected.season === 'ete' ? 'bg-yellow-50 border-2 border-yellow-400 text-yellow-400' : 'bg-white border border-gray-200 text-gray-400 hover:border-yellow-200 hover:text-yellow-300'}`}
                    >
                      <Sun size={24} fill={selected.season === 'ete' ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => setSelected({...selected, season: selected.season === '4-saisons' ? '' : '4-saisons'})}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${selected.season === '4-saisons' ? 'bg-[#1E88E5] text-white border-2 border-[#1565C0]' : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-300'}`}
                    >
                      <CloudLightning size={24} fill={selected.season === '4-saisons' ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => setSelected({...selected, season: selected.season === 'hiver' ? '' : 'hiver'})}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${selected.season === 'hiver' ? 'bg-[#B3E5FC] text-blue-800 border-2 border-[#81D4FA]' : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-100 hover:text-blue-200'}`}
                    >
                      <CloudSnow size={24} fill={selected.season === 'hiver' ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button 
                    onClick={handleSearch}
                    className="bg-[#99A1AF] text-white font-bold py-4 px-8 rounded text-sm text-center uppercase tracking-wide hover:bg-gray-500 transition-colors shadow-sm leading-tight w-full md:w-auto"
                  >
                    RECHERCHER<br />
                    LES PNEUS
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
