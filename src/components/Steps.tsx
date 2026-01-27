import React from 'react';
import { Disc, MapPin, CreditCard, Truck, Search, Lightbulb, Car, Building2, Package, Check } from 'lucide-react';

export default function Steps() {
  return (
    <section className="py-4 md:py-6 bg-white">
      <div className="md:container md:mx-auto md:px-4">
        <div className="bg-[#111111] rounded-lg p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* Step 1 */}
            <div className="bg-[#1A1A1A] p-4 md:p-6 rounded-lg flex gap-3 md:gap-4 items-start border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="text-[#00CCFF] mt-1 flex-shrink-0">
                <Disc size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base md:text-lg mb-2 md:mb-4">1. Trouvez les pneus parfaits</h3>
                <ul className="space-y-2 md:space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-3">
                    <Search size={16} className="text-[#00CCFF] mt-0.5 flex-shrink-0" />
                    <span>Saisie rapide : dimensions ou modèle de véhicule.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>+25 000 références pour tous budgets.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Car size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span>Filtres intelligents en quelques secondes.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#1A1A1A] p-4 md:p-6 rounded-lg flex gap-3 md:gap-4 items-start border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="text-[#00CCFF] mt-1 flex-shrink-0">
                <MapPin size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base md:text-lg mb-2 md:mb-4">2. Choisissez <span className="text-[#00CCFF]">votre lieu</span></h3>
                <ul className="space-y-2 md:space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-3">
                    <Building2 size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>Garages partenaires près de chez vous.</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-500 mt-3 pl-7">Flexibilité et montage simplifié.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#1A1A1A] p-4 md:p-6 rounded-lg flex gap-3 md:gap-4 items-start border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="text-[#00CCFF] mt-1 flex-shrink-0">
                <CreditCard size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base md:text-lg mb-2 md:mb-4">3. Payez <span className="text-[#00CCFF]">comme vous voulez</span></h3>
                <ul className="space-y-2 md:space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-3">
                    <Check size={16} className="text-white mt-0.5 flex-shrink-0" />
                    <span>Carte, PayPal, Apple Pay, Sofort.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={16} className="text-white mt-0.5 flex-shrink-0" />
                    <span>Paiement en plusieurs fois.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#1A1A1A] p-4 md:p-6 rounded-lg flex gap-3 md:gap-4 items-start border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="text-[#00CCFF] mt-1 flex-shrink-0">
                <Truck size={40} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base md:text-lg mb-2 md:mb-4">4. Recevez <span className="text-[#00CCFF]">rapidement</span></h3>
                <ul className="space-y-2 md:space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-3">
                    <Package size={16} className="text-orange-800 mt-0.5 flex-shrink-0" />
                    <span>Express : montage immédiat.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Standard : gratuit dès 2 pneus.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
