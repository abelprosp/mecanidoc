import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';

export default function WarrantyBanner() {
  return (
    <section className="py-4 bg-white">
      <div className="container mx-auto px-4">
        {/* Compact Banner */}
        <div className="bg-gradient-to-r from-[#0066CC] to-[#004499] rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
              <Shield size={28} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg uppercase tracking-wide">
                Garantie MecaniDoc
              </h3>
              <p className="text-white/90 text-sm">
                Votre pneu <strong className="text-white">remplacé ou remboursé</strong> en cas de dommage !
              </p>
            </div>
          </div>
          
          {/* Right: CTA Button */}
          <a 
            href="#" 
            className="bg-white text-[#0066CC] hover:bg-gray-100 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors flex-shrink-0"
          >
            En savoir plus <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
