import React from 'react';
import { Star, ShoppingCart, Fuel, CloudRain, Volume2, Sun, Tag, Tractor } from 'lucide-react';

// EU Tire Label Component
const TireLabel = ({ type, value, color }: { type: 'fuel' | 'wet' | 'noise', value: string | number, color: string }) => {
  const icons = {
    fuel: <Fuel size={14} className="text-gray-700" />,
    wet: <CloudRain size={14} className="text-gray-700" />,
    noise: <Volume2 size={14} className="text-gray-700" />
  };

  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-4 flex justify-center">{icons[type]}</div>
      {type === 'noise' ? (
        <div className="flex items-center bg-gray-800 text-white text-[10px] font-bold px-1 h-5 rounded-r-sm relative ml-4 w-12 justify-between">
           {/* Triangle pointing left */}
           <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[8px] border-r-gray-800 border-b-[10px] border-b-transparent"></div>
           <span className="ml-1">{value}</span>
           <span className="text-[8px] scale-75">dB</span>
        </div>
      ) : (
        <div className={`flex items-center text-white text-[10px] font-bold px-2 h-5 rounded-r-sm relative ml-4 w-12 justify-center ${color}`}>
           {/* Triangle pointing left */}
           <div className={`absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[8px] border-b-[10px] border-b-transparent`} style={{ borderRightColor: 'inherit' }}></div>
           {value}
        </div>
      )}
    </div>
  );
};

const products = [
  {
    id: 1,
    name: 'MICHELIN AGRIBIB 2',
    specs: '420/85 R28 139 A8',
    rating: 4.9,
    reviews: 120,
    price: 850.00,
    image: 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Tractor+Tire', 
    efficiency: { 
      fuel: { val: 'C', col: 'bg-yellow-400 border-yellow-400' }, 
      wet: { val: 'B', col: 'bg-green-500 border-green-500' }, 
      noise: 75 
    }
  },
  {
    id: 2,
    name: 'BKT AGRIMAX RT 657',
    specs: '540/65 R30 143 D',
    rating: 4.7,
    reviews: 95,
    price: 720.50,
    image: 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Tractor+Tire',
    efficiency: { 
      fuel: { val: 'D', col: 'bg-orange-400 border-orange-400' }, 
      wet: { val: 'B', col: 'bg-green-500 border-green-500' }, 
      noise: 76 
    }
  },
  {
    id: 3,
    name: 'TRELLEBORG TM700',
    specs: '520/70 R38 150 D',
    rating: 4.8,
    reviews: 80,
    price: 1150.00,
    image: 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Tractor+Tire',
    efficiency: { 
      fuel: { val: 'C', col: 'bg-yellow-400 border-yellow-400' }, 
      wet: { val: 'B', col: 'bg-green-500 border-green-500' }, 
      noise: 75 
    }
  },
  {
    id: 4,
    name: 'FIRESTONE PERFORMER 70',
    specs: '480/70 R34 143 D',
    rating: 4.6,
    reviews: 65,
    price: 980.20,
    image: 'https://placehold.co/200x200/f3f4f6/d1d5db?text=Tractor+Tire',
    efficiency: { 
      fuel: { val: 'D', col: 'bg-orange-400 border-orange-400' }, 
      wet: { val: 'C', col: 'bg-yellow-400 border-yellow-400' }, 
      noise: 77 
    }
  },
];

export default function BestSellersTractor() {
  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wide">Les meilleures ventes Agricoles</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col relative group">
              
              {/* Rating Top Right */}
              <div className="flex flex-col items-end mb-2">
                <div className="flex text-yellow-400 gap-0.5 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      fill={i < Math.floor(product.rating) ? "currentColor" : "none"} 
                      className={i < Math.floor(product.rating) ? "" : "text-gray-300"} 
                      strokeWidth={i < Math.floor(product.rating) ? 0 : 1.5}
                    />
                  ))}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-orange-500">{product.rating}/5</span>
                </div>
                <span className="text-[10px] text-gray-400">({product.reviews} avis)</span>
              </div>

              {/* Content Middle */}
              <div className="flex gap-4 mb-4">
                {/* Product Image */}
                <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                   <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
                </div>

                {/* EU Labels */}
                <div className="flex flex-col justify-center pt-2">
                  <TireLabel type="fuel" value={product.efficiency.fuel.val} color={product.efficiency.fuel.col} />
                  <TireLabel type="wet" value={product.efficiency.wet.val} color={product.efficiency.wet.col} />
                  <TireLabel type="noise" value={product.efficiency.noise} color="bg-black" />
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase leading-tight">
                  {product.name} <span className="text-gray-500 font-normal">{product.specs}</span>
                </h3>
              </div>

              {/* Tags */}
              <div className="flex gap-2 mb-6">
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded border border-yellow-100 text-[10px] font-bold uppercase">
                  <Sun size={12} fill="currentColor" />
                  Champs
                </div>
                <div className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded border border-green-100 text-[10px] font-bold uppercase">
                  <Tractor size={12} fill="currentColor" />
                  AGRI
                </div>
              </div>

              {/* Price & Action */}
              <div className="mt-auto border-t border-gray-50 pt-4">
                <div className="text-center mb-4">
                  <span className="text-2xl font-extrabold text-gray-900">€{product.price.toFixed(2)}</span>
                </div>
                <button className="w-full bg-[#003399] hover:bg-blue-800 text-white py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <ShoppingCart size={18} />
                  Voir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
