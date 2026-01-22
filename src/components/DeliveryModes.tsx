import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function DeliveryModes() {
  return (
    <section className="pb-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden pb-8">
          {/* Header Bar */}
          <div className="bg-[#0066CC] py-3 text-center mb-10">
            <h2 className="text-white font-bold text-lg">Modes de Livraison</h2>
          </div>

          <div className="px-4 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Standard */}
              <div className="bg-white p-8 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-center flex flex-col items-center hover:shadow-md transition-shadow h-full">
                <h3 className="font-bold text-black text-lg mb-3 uppercase tracking-wide">STANDARD</h3>
                <span className="text-[#0066CC] font-bold mb-4 text-sm">GRATUITE</span>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Livraison gratuite pour toute commande de<br/> deux pneus ou plus.
                </p>
              </div>

              {/* Express */}
              <div className="bg-white p-8 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-center flex flex-col items-center hover:shadow-md transition-shadow h-full">
                <h3 className="font-bold text-black text-lg mb-3 uppercase tracking-wide">EXPRESS</h3>
                <span className="text-[#0066CC] font-bold mb-4 text-sm">Livraison prioritaire</span>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Vos pneus livrés rapidement et en toute<br/> sécurité.
                </p>
              </div>

              {/* Point de Retrait */}
              <div className="bg-white p-8 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-center flex flex-col items-center hover:shadow-md transition-shadow h-full">
                <h3 className="font-bold text-black text-lg mb-3 uppercase tracking-wide">POINT DE RETRAIT</h3>
                <span className="text-[#0066CC] font-bold mb-4 text-sm">Retrait dans un point partenaire</span>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Choisissez le point de livraison le plus pratique pour vous et recevez vos pneus en toute simplicité.
                </p>
              </div>
            </div>

            <div className="text-center mt-10">
              <a href="#" className="text-[#0066CC] hover:text-blue-800 inline-flex items-center gap-1 text-sm font-medium transition-colors">
                En savoir plus <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
