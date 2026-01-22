import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function BrandCarouselTractor() {
  const brands = [
    { 
      name: 'MICHELIN', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Michelin_Logo.svg/320px-Michelin_Logo.svg.png',
      color: 'text-blue-900' 
    },
    { 
      name: 'TRELLEBORG', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Trelleborg_logo.svg/320px-Trelleborg_logo.svg.png',
      color: 'text-blue-800' 
    },
    { 
      name: 'BKT', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/BKT_Tires_Logo.svg/320px-BKT_Tires_Logo.svg.png',
      color: 'text-black' 
    },
    { 
      name: 'FIRESTONE', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Firestone_logo.svg/320px-Firestone_logo.svg.png',
      color: 'text-red-600' 
    },
    { 
      name: 'MITAS', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Mitas_logo.svg/320px-Mitas_logo.svg.png',
      color: 'text-blue-600' 
    },
  ];

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg p-6 flex flex-col md:flex-row items-center gap-8">
          
          {/* Left Title Section */}
          <div className="w-full md:w-32 flex-shrink-0 self-start md:self-center pt-4 md:pt-0">
            <h3 className="font-extrabold text-gray-800 text-lg uppercase leading-tight tracking-wide">
              Marques<br />
              Pneus<br />
              Agricoles
            </h3>
          </div>
          
          {/* Carousel Section */}
          <div className="flex-1 w-full relative">
            
            {/* Helper Text */}
            <div className="text-center mb-4 text-sm text-gray-400 italic">
               Faites glisser sur le côté →
            </div>

            <div className="relative group">
               {/* Left Button */}
               <button className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg text-gray-600 rounded-full p-2 z-10 transition-all opacity-0 group-hover:opacity-100 md:opacity-100">
                 <ChevronLeft size={24} />
               </button>

               {/* Cards Container */}
               <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 scrollbar-hide snap-x">
                 {brands.map((brand) => (
                   <div key={brand.name} className="flex-shrink-0 snap-center">
                     <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow w-40 h-32 flex flex-col items-center justify-center p-4 gap-3 cursor-pointer">
                       <div className="h-12 flex items-center justify-center w-full">
                         <img 
                           src={brand.logo} 
                           alt={brand.name} 
                           className="max-h-full max-w-full object-contain"
                         />
                       </div>
                       <span className={`text-xs font-bold uppercase ${brand.color}`}>{brand.name}</span>
                     </div>
                   </div>
                 ))}
                 
                 {/* Placeholder for "OR" or more brands */}
                 <div className="flex-shrink-0 snap-center">
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow w-40 h-32 flex flex-col items-center justify-center p-4 gap-3 cursor-pointer">
                       <span className="text-2xl font-bold text-orange-500">OR</span>
                       <span className="text-xs font-bold text-blue-900 uppercase">OR</span>
                    </div>
                 </div>
               </div>

               {/* Right Button */}
               <button className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg text-gray-600 rounded-full p-2 z-10 transition-all">
                 <ChevronRight size={24} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
