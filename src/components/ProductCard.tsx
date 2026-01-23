"use client";

import React from 'react';
import { Star, Fuel, CloudRain, Volume2, Sun, CloudLightning, CloudSnow } from 'lucide-react';
import Link from 'next/link';
import { useProductPrice } from '@/hooks/useProductPrice';

interface ProductCardProps {
  product: any;
}

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

export default function ProductCard({ product }: ProductCardProps) {
  const specs = product.specs || {};
  const labels = product.labels || {};
  const { finalPrice } = useProductPrice(product.base_price || 0, product.category || 'Auto');
  
  // Determine Label Colors
  const fuelColor = (labels.fuel === 'A' || labels.fuel === 'B') ? 'bg-green-500 border-green-500' : (labels.fuel === 'C' || labels.fuel === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';
  const wetColor = (labels.wet === 'A' || labels.wet === 'B') ? 'bg-green-500 border-green-500' : (labels.wet === 'C' || labels.wet === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';

  // Season Icon
  const getSeasonIcon = (season: string) => {
    const s = season?.toLowerCase() || '';
    if (s.includes('hiver') || s.includes('winter')) return <CloudSnow size={14} className="text-blue-400" />;
    if (s.includes('4') || s.includes('all')) return <CloudLightning size={14} className="text-green-500" />;
    return <Sun size={14} className="text-orange-400" />;
  };

  return (
    <div className="bg-[#FAF9F6] rounded-xl shadow-sm border border-gray-100 p-5 h-full flex flex-col justify-between relative group">
      
      {/* 1. Header: Brand, Stars, Price */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="h-6 flex items-center">
            {product.brands?.logo_url ? (
              <img 
                src={product.brands.logo_url} 
                alt={product.brands?.name || product.brand || 'Marque'} 
                className="h-full w-auto object-contain" 
              />
            ) : (
              <span className="text-xs font-bold text-gray-700 uppercase">
                {product.brands?.name || product.brand || 'Marque'}
              </span>
            )}
          </div>
          {/* Stars */}
          <div className="flex items-center gap-1">
             <div className="flex text-orange-300 text-[10px]">
               {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < 4 ? "currentColor" : "none"} />)}
             </div>
             <span className="text-[10px] text-gray-400 font-medium">4,3/5</span>
          </div>
        </div>

        {/* Price (Top Right) */}
        <span className="text-2xl font-bold text-[#5c7c9e]">€{finalPrice.toFixed(2)}</span>
      </div>

      {/* 2. Main Content: Image & Info */}
      <div className="flex gap-6 mb-4">
        {/* Left: Image */}
        <div className="w-32 flex-shrink-0 flex items-center justify-center">
          <img 
            src={product.images?.[0] || 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Pneu'} 
            alt={product.name} 
            className="w-full h-auto object-contain mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Right: Info */}
        <div className="flex-1 flex flex-col justify-center pt-2">
          {/* Title */}
          <h3 className="font-bold text-gray-800 text-base uppercase leading-tight tracking-wide mb-1">
            {product.brands?.name || product.brand} <br />
            <span className="text-gray-600">{product.name}</span>
          </h3>

          {/* Specs */}
          <p className="text-gray-500 font-medium text-sm mb-2">
            {specs.width}/{specs.height} R{specs.diameter} {specs.load_index} {specs.speed_index}
            {specs.autres_categories && specs.autres_categories.length > 0 && (
              <span className="ml-2 text-gray-400">
                {specs.autres_categories.join(', ')}
              </span>
            )}
          </p>

          {/* Season & Category */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1 text-orange-400">
              {getSeasonIcon(specs.season)}
              <span className="font-medium text-gray-500">{specs.season || 'Été'}</span>
            </div>
            <span>•</span>
            <span>{product.category || 'Auto'}</span>
          </div>
        </div>
      </div>

      {/* 3. Footer: Labels & Button */}
      <div className="flex justify-between items-end mt-auto">
        {/* Labels */}
        <div className="flex gap-2 mb-1">
          <TireLabel type="fuel" value={labels.fuel || '-'} color={fuelColor} />
          <TireLabel type="wet" value={labels.wet || '-'} color={wetColor} />
          <TireLabel type="noise" value={labels.noise || '-'} color="bg-gray-600" />
        </div>

        {/* Button */}
        <Link href={`/product/${product.id}`}>
          <button className="bg-[#5c8bc0] hover:bg-[#4a72a0] text-white text-xs font-bold py-2 px-8 rounded shadow-sm transition-colors uppercase tracking-wider">
            VOIR
          </button>
        </Link>
      </div>

    </div>
  );
}
