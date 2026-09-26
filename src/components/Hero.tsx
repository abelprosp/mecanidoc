"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Car, Bike, Truck, Tractor, Sun, ChevronDown, CloudLightning, CloudSnow, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { specFieldMatches } from '@/lib/product-query-helpers';

export type HeroCategory = 'Auto' | 'Moto' | 'Camion' | 'Tracteurs';

type HeroProps = { category?: HeroCategory | string };

type DimensionCombo = {
  width: string | null;
  height: string | null;
  diameter: string | null;
  load_index: string | null;
  speed_index: string | null;
};

const TABS: Array<{ key: HeroCategory; label: string; href: string; icon: LucideIcon }> = [
  { key: 'Auto', label: 'Auto', href: '/', icon: Car },
  { key: 'Moto', label: 'Moto', href: '/moto', icon: Bike },
  { key: 'Camion', label: 'Camion', href: '/camion', icon: Truck },
  { key: 'Tracteurs', label: 'Tracteurs', href: '/tracteurs', icon: Tractor },
];

const BACKGROUNDS: Record<HeroCategory, { src: string; alt: string }> = {
  Auto: { src: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=2072&auto=format&fit=crop', alt: 'Atelier automobile' },
  Moto: { src: 'https://images.unsplash.com/photo-1558981806-ec527fa84c3d?q=80&w=2070&auto=format&fit=crop', alt: 'Atelier moto' },
  Camion: { src: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop', alt: 'Atelier camion' },
  Tracteurs: { src: 'https://images.unsplash.com/photo-1595185966442-d621b1834927?q=80&w=2070&auto=format&fit=crop', alt: 'Atelier tracteur' },
};

const SEASONS = [
  { key: 'ete', label: 'Été', icon: Sun, active: 'bg-yellow-50 border-2 border-yellow-400 text-yellow-400', hover: 'hover:border-yellow-200 hover:text-yellow-300' },
  { key: '4-saisons', label: '4 saisons', icon: CloudLightning, active: 'bg-[#1E88E5] text-white border-2 border-[#1565C0]', hover: 'hover:border-blue-200 hover:text-blue-300' },
  { key: 'hiver', label: 'Hiver', icon: CloudSnow, active: 'bg-[#B3E5FC] text-blue-800 border-2 border-[#81D4FA]', hover: 'hover:border-blue-100 hover:text-blue-200' },
] as const;

const numericSort = (a: string, b: string) => parseFloat(a) - parseFloat(b);
const uniqueSorted = (values: Array<string | null | undefined>, sorter = numericSort) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort(sorter);

/**
 * Bloco principal da homepage e das páginas Moto/Camion/Tracteurs: pesquisa de
 * pneus por dimensões, com separadores de categoria. Um único componente para as
 * quatro categorias (antes eram quatro cópias quase idênticas).
 */
export default function Hero({ category = 'Auto' }: HeroProps) {
  const active: HeroCategory = (TABS.find((t) => t.key === category)?.key ?? 'Auto');
  const background = BACKGROUNDS[active];

  const [combos, setCombos] = useState<DimensionCombo[]>([]);
  const [selected, setSelected] = useState({ width: '', height: '', diameter: '', load: '', speed: '', season: '' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products/dimensions?category=${encodeURIComponent(active)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setCombos(Array.isArray(json.data) ? json.data : []))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') console.error('Hero dimensions:', e);
      });
    return () => controller.abort();
  }, [active]);

  const availableWidths = useMemo(() => uniqueSorted(combos.map((s) => s.width)), [combos]);

  const availableHeights = useMemo(() => {
    if (!selected.width) return [];
    return uniqueSorted(combos.filter((s) => specFieldMatches(s.width, selected.width)).map((s) => s.height));
  }, [combos, selected.width]);

  const availableDiameters = useMemo(() => {
    if (!selected.width || !selected.height) return [];
    return uniqueSorted(
      combos.filter((s) => specFieldMatches(s.width, selected.width) && specFieldMatches(s.height, selected.height)).map((s) => s.diameter)
    );
  }, [combos, selected.width, selected.height]);

  const availableLoads = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    return uniqueSorted(
      combos
        .filter((s) => specFieldMatches(s.width, selected.width) && specFieldMatches(s.height, selected.height) && specFieldMatches(s.diameter, selected.diameter))
        .map((s) => s.load_index)
    );
  }, [combos, selected.width, selected.height, selected.diameter]);

  const availableSpeeds = useMemo(() => {
    if (!selected.width || !selected.height || !selected.diameter) return [];
    return uniqueSorted(
      combos
        .filter(
          (s) =>
            specFieldMatches(s.width, selected.width) &&
            specFieldMatches(s.height, selected.height) &&
            specFieldMatches(s.diameter, selected.diameter) &&
            (!selected.load || specFieldMatches(s.load_index, selected.load))
        )
        .map((s) => s.speed_index),
      (a, b) => a.localeCompare(b)
    );
  }, [combos, selected.width, selected.height, selected.diameter, selected.load]);

  const hasThreeDimensions = Boolean(selected.width.trim() && selected.height.trim() && selected.diameter.trim());

  const handleSearch = () => {
    if (!hasThreeDimensions) return;
    const params = new URLSearchParams();
    params.set('category', active);
    params.set('width', selected.width);
    params.set('height', selected.height);
    params.set('diameter', selected.diameter);
    if (selected.load) params.set('load_index', selected.load);
    if (selected.speed) params.set('speed_index', selected.speed);
    if (selected.season) params.set('season', selected.season);
    window.location.href = `/search?${params.toString()}`;
  };

  const selectClass = (disabled: boolean) =>
    `w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-white'}`;

  const fields: Array<{
    id: string;
    label: string;
    value: string;
    disabled: boolean;
    options: string[];
    onChange: (v: string) => void;
  }> = [
    { id: 'hero-width', label: 'Largeur', value: selected.width, disabled: false, options: availableWidths, onChange: (v) => setSelected({ ...selected, width: v, height: '', diameter: '', load: '', speed: '' }) },
    { id: 'hero-height', label: 'Hauteur', value: selected.height, disabled: !selected.width, options: availableHeights, onChange: (v) => setSelected({ ...selected, height: v, diameter: '', load: '', speed: '' }) },
    { id: 'hero-diameter', label: 'Diamètre', value: selected.diameter, disabled: !selected.height, options: availableDiameters, onChange: (v) => setSelected({ ...selected, diameter: v, load: '', speed: '' }) },
    { id: 'hero-load', label: 'Charge', value: selected.load, disabled: !selected.diameter, options: availableLoads, onChange: (v) => setSelected({ ...selected, load: v, speed: '' }) },
    { id: 'hero-speed', label: 'Vitesse', value: selected.speed, disabled: !selected.diameter, options: availableSpeeds, onChange: (v) => setSelected({ ...selected, speed: v }) },
  ];

  return (
    <div className="layout-container py-3 md:py-5">
      <div className="relative bg-gray-900 h-auto md:h-[550px] md:rounded-[2.5rem] flex flex-col items-center justify-center text-white overflow-hidden shadow-2xl py-8 md:py-0 px-3 sm:px-4 md:px-6">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={background.src} alt="" role="presentation" className="w-full h-full object-cover opacity-50" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 drop-shadow-lg leading-tight">
            Roulez en toute sécurité avec mecanidoc.com : parce que votre
            <br />
            sécurité est notre priorité
          </h1>

          <div className="w-full max-w-3xl">
            {/* Tabs */}
            <nav
              aria-label="Type de véhicule"
              className="flex flex-nowrap overflow-x-auto items-end pl-2 relative z-20 pb-1 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {TABS.map((tab, index) => {
                const isActive = tab.key === active;
                const Icon = tab.icon;
                const isLast = index === TABS.length - 1;
                return (
                  <div key={tab.key} className={`flex-shrink-0 relative ${isLast ? '' : '-mr-4'}`} style={{ zIndex: isActive ? 50 : 40 - index * 10 }}>
                    <Link href={tab.href} aria-current={isActive ? 'page' : undefined}>
                      <div
                        className={`px-3 py-2.5 md:px-8 md:py-3 rounded-t-md flex items-center gap-1.5 md:gap-2 transform skew-x-[20deg] min-h-[42px] md:min-h-0 ${
                          isActive
                            ? 'bg-white text-gray-800 font-bold shadow-[2px_-2px_5px_rgba(0,0,0,0.1)] md:px-10'
                            : 'bg-[#E5E7EB] text-gray-600 font-medium hover:bg-gray-300 transition-colors cursor-pointer shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)] ' + (isLast ? '' : 'border-r border-gray-300')
                        }`}
                      >
                        <div className="transform -skew-x-[20deg] flex items-center gap-1.5 md:gap-2">
                          <Icon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
                          <span className="text-xs md:text-base">{tab.label}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Form */}
            <div className="bg-white rounded-b-xl rounded-tr-xl shadow-2xl p-4 md:p-6 text-gray-800 relative z-30 mt-[-1px]">
              <div className="border border-gray-100 rounded-xl p-4 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
                  {fields.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <label htmlFor={f.id} className="text-sm font-semibold text-gray-800 ml-1 mb-1">{f.label}</label>
                      <div className="relative">
                        <select id={f.id} value={f.value} disabled={f.disabled} onChange={(e) => f.onChange(e.target.value)} className={selectClass(f.disabled)}>
                          <option value="">{f.label}</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} aria-hidden />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex gap-3" role="group" aria-label="Saison">
                    {SEASONS.map((s) => {
                      const isOn = selected.season === s.key;
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          aria-pressed={isOn}
                          aria-label={s.label}
                          title={s.label}
                          onClick={() => setSelected({ ...selected, season: isOn ? '' : s.key })}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${isOn ? s.active : `bg-white border border-gray-200 text-gray-400 ${s.hover}`}`}
                        >
                          <Icon size={24} fill={isOn ? 'currentColor' : 'none'} aria-hidden />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!hasThreeDimensions}
                    onClick={handleSearch}
                    className={`text-white font-bold py-4 px-8 rounded text-sm text-center uppercase tracking-wide transition-colors shadow-sm leading-tight w-full md:w-auto ${
                      hasThreeDimensions ? 'bg-[#0066CC] hover:bg-blue-600 cursor-pointer' : 'bg-[#99A1AF] cursor-not-allowed opacity-90'
                    }`}
                  >
                    {hasThreeDimensions ? (
                      <>RECHERCHER<br />LES PNEUS</>
                    ) : (
                      <>LARGEUR, HAUTEUR<br />ET DIAMÈTRE</>
                    )}
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
