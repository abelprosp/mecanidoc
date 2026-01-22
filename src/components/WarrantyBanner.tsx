import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function WarrantyBanner() {
  return (
    <section className="py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="bg-[#0066CC] py-3 text-center">
            <h2 className="text-white font-bold text-lg">La Garantie MecaniDoc</h2>
          </div>
          
          {/* Content */}
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 max-w-5xl mx-auto">
            <div className="max-w-xl text-center md:text-left">
              <h3 className="text-2xl md:text-3xl text-gray-600 mb-4 uppercase tracking-wide font-normal">
                GARANTIE <span className="font-normal">MecaniDoc</span>
              </h3>
              <p className="text-gray-500 mb-6 leading-relaxed text-sm md:text-base">
                Votre pneu <strong className="text-gray-700 font-bold">remplacé ou remboursé</strong> en toute sérénité<br className="hidden md:block" />
                en cas de dommage !
              </p>
              <a href="#" className="text-[#0066CC] hover:text-blue-800 flex items-center justify-center md:justify-start gap-1 text-sm font-medium transition-colors">
                En savoir plus <ArrowRight size={16} />
              </a>
            </div>
            
            <div className="flex-shrink-0">
               {/* 3 Tires Image Placeholder */}
               <div className="relative w-64 h-40 md:w-80 md:h-48">
                  <img 
                    src="https://pngimg.com/uploads/tires/tires_PNG34.png" 
                    alt="Garantie Pneus" 
                    className="w-full h-full object-contain drop-shadow-2xl transform scale-110"
                  />
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
