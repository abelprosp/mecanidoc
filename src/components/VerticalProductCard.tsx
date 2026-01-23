"use client";

import React from 'react';
import { Star, ShoppingCart, Sun, CloudSnow, CloudLightning, Car, Bike, Truck, Tractor, Fuel, CloudRain, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useProductPrice } from '@/hooks/useProductPrice';
import CategoryTooltip from './CategoryTooltip';

interface ProductCardProps {
  product: any;
}

// Reuse TireLabel logic locally
const TireLabel = ({ type, value, color }: { type: 'fuel' | 'wet' | 'noise', value: string | number, color: string }) => {
  const icons = {
    fuel: <Fuel size={12} className="text-gray-600" />,
    wet: <CloudRain size={12} className="text-gray-600" />,
    noise: <Volume2 size={12} className="text-gray-600" />
  };

  return (
    <div className="flex items-center gap-1">
      <div className="w-4 flex justify-center">{icons[type]}</div>
      {type === 'noise' ? (
        <div className="flex items-center bg-gray-600 text-white text-[9px] font-bold px-1 h-4 rounded-r-sm relative ml-2 w-10 justify-between">
           <div className="absolute -left-1.5 top-0 w-0 h-0 border-t-[8px] border-t-transparent border-r-[6px] border-r-gray-600 border-b-[8px] border-b-transparent"></div>
           <span className="ml-0.5">{value}</span>
           <span className="text-[6px] scale-75">dB</span>
        </div>
      ) : (
        <div className={`flex items-center text-white text-[10px] font-bold px-1 h-4 rounded-r-sm relative ml-2 w-6 justify-center ${color}`}>
           <div className={`absolute -left-1.5 top-0 w-0 h-0 border-t-[8px] border-t-transparent border-r-[6px] border-b-[8px] border-b-transparent`} style={{ borderRightColor: 'inherit' }}></div>
           {value}
        </div>
      )}
    </div>
  );
};

export default function VerticalProductCard({ product }: ProductCardProps) {
  // Garantir que specs seja um objeto e autres_categories seja array
  let specs: any = {};
  try {
    if (typeof product.specs === 'string') {
      specs = JSON.parse(product.specs);
    } else {
      specs = product.specs || {};
    }
  } catch (e) {
    specs = {};
  }
  
  // Garantir que autres_categories seja array
  if (specs.autres_categories && typeof specs.autres_categories === 'string') {
    specs.autres_categories = specs.autres_categories.split(/[,;|]/).map((c: string) => c.trim()).filter((c: string) => c.length > 0);
  } else if (!Array.isArray(specs.autres_categories)) {
    specs.autres_categories = [];
  }
  
  const labels = product.labels || {};
  const { finalPrice } = useProductPrice(product.base_price || 0, product.category || 'Auto');

  // Label Colors
  const fuelColor = (labels.fuel === 'A' || labels.fuel === 'B') ? 'bg-green-500 border-green-500' : (labels.fuel === 'C' || labels.fuel === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';
  const wetColor = (labels.wet === 'A' || labels.wet === 'B') ? 'bg-green-500 border-green-500' : (labels.wet === 'C' || labels.wet === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';
  
  // Season Icon
  const getSeasonIcon = (season: string) => {
    const s = season?.toLowerCase() || '';
    if (s.includes('hiver') || s.includes('winter')) return <CloudSnow size={14} className="text-blue-500" />;
    if (s.includes('4') || s.includes('all')) return <CloudLightning size={14} className="text-green-500" />;
    return <Sun size={14} className="text-[#0066CC]" />;
  };

  const getCategoryIcon = (category: string) => {
    const c = category?.toLowerCase() || '';
    if (c === 'moto') return <Bike size={14} className="text-green-600" />;
    if (c === 'camion') return <Truck size={14} className="text-green-600" />;
    if (c === 'tracteurs') return <Tractor size={14} className="text-green-600" />;
    return <Car size={14} className="text-green-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 flex flex-col items-center text-center h-full relative group hover:shadow-lg transition-shadow">
      
      {/* Header: Brand/Model & Stars */}
      <div className="flex justify-between items-start w-full mb-3">
         {/* Brand Logo & Model Name (Left) */}
         <div className="flex flex-col items-start">
            {/* Brand Logo */}
            <div className="h-5 mb-1 flex items-center">
              {product.brands?.logo_url ? (
                <img 
                  src={product.brands.logo_url} 
                  alt={product.brands?.name || product.brand || 'Marque'} 
                  className="h-full w-auto object-contain max-w-[80px]"
                />
              ) : (
                <span className="text-xs font-bold text-gray-800 uppercase">
                  {product.brands?.name || product.brand || 'Marque'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-600 font-medium line-clamp-1">
              {[product.brands?.name || product.brand, product.name].filter(Boolean).join(' ')}
            </span>
         </div>

         {/* Stars (Right) */}
         <div className="flex flex-col items-end">
             <div className="flex gap-0.5 text-yellow-400 mb-1">
                {[...Array(5)].map((_, i) => (
                   <Star key={i} size={12} fill="currentColor" className="text-yellow-400" />
                ))}
             </div>
             <div className="flex items-baseline gap-1 text-xs">
                <span className="font-bold text-orange-500">4.6/5</span>
                <span className="text-gray-400 text-[10px]">(481 avis)</span>
             </div>
         </div>
      </div>

      {/* Image & Labels Row */}
      <div className="flex justify-center items-center gap-3 mb-3 w-full">
         {/* Image */}
         <div className="w-28 h-28 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative">
            <img 
              src={product.images?.[0] || 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Pneu'} 
              alt={product.name} 
              className="w-full h-full object-cover mix-blend-multiply opacity-80"
            />
         </div>

         {/* Labels Column (Right of Image) */}
         <div className="flex flex-col gap-1.5">
            <TireLabel type="fuel" value={labels.fuel || '-'} color={fuelColor} />
            <TireLabel type="wet" value={labels.wet || '-'} color={wetColor} />
            <TireLabel type="noise" value={labels.noise || '-'} color="bg-gray-600" />
         </div>
      </div>

      {/* Specs - Dimension with load and speed index */}
      <p className="text-gray-900 text-sm font-semibold mb-3">
        <span>{specs.width}/{specs.height}R{specs.diameter} {specs.load_index || ''}{specs.speed_index || ''}</span>
        {specs.autres_categories && specs.autres_categories.length > 0 && (
          <>
            {' '}
            {specs.autres_categories.map((cat: string, index: number) => (
              <React.Fragment key={index}>
                {index > 0 && ', '}
                <CategoryTooltip category={cat} />
              </React.Fragment>
            ))}
          </>
        )}
      </p>

      {/* Badges (Season/Category) */}
      <div className="flex gap-2 mb-4 w-full justify-center">
         <div className="flex items-center gap-1 border border-blue-200 bg-blue-50 text-[#0066CC] px-3 py-1 rounded text-[10px] font-bold uppercase">
            {getSeasonIcon(specs.season)}
            {specs.season || 'Été'}
         </div>
         <div className="flex items-center gap-1 border border-green-200 bg-green-50 text-green-600 px-3 py-1 rounded text-[10px] font-bold uppercase">
            {getCategoryIcon(product.category)}
            {product.category || 'AUTO'}
         </div>
      </div>

      {/* Divider */}
      <div className="w-full border-t border-gray-100 mb-4"></div>

      {/* Price */}
      <div className="text-center mb-4">
        <span className="text-2xl font-bold text-gray-900">€{finalPrice.toFixed(2)}</span>
      </div>

      {/* Button */}
      <Link href={`/product/${product.id}`} className="w-full mt-auto">
        <button className="w-full bg-[#003399] hover:bg-blue-800 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <ShoppingCart size={16} />
          Voir
        </button>
      </Link>

    </div>
  );
}
