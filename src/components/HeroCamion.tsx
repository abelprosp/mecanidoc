"use client";

import React, { useState } from 'react';
import { Car, Bike, Truck, Tractor, Sun, ChevronDown, CloudLightning, CloudSnow } from 'lucide-react';
import Link from 'next/link';

export default function HeroCamion() {
  const [selected, setSelected] = useState({
    width: '',
    height: '',
    diameter: '',
    load: '',
    speed: '',
    season: ''
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative bg-gray-900 h-auto md:h-[550px] rounded-[2.5rem] flex flex-col items-center justify-center text-white overflow-hidden shadow-2xl py-12 md:py-0">
        {/* Background Image - Truck specific */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop" 
            alt="Truck Workshop Background" 
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

               {/* Active Tab: Camion */}
               <div className="flex-shrink-0 relative z-50 -mr-4">
                <Link href="/camion">
                  <div className="bg-white text-gray-800 px-2 py-2 md:px-8 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-bold transform skew-x-[20deg] shadow-[2px_-2px_5px_rgba(0,0,0,0.1)]">
                    <div className="transform -skew-x-[20deg] flex items-center gap-1 md:gap-2">
                      <Truck className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      <span className="text-[10px] md:text-base">Camion</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Inactive Tab: Tracteurs */}
              <div className="flex-shrink-0 relative z-10">
                <Link href="/tracteurs">
                  <div className="bg-[#E5E7EB] text-gray-600 px-2 py-2 md:px-8 md:py-3 rounded-t-md flex items-center gap-1 md:gap-2 font-medium transform skew-x-[20deg] hover:bg-gray-300 transition-colors cursor-pointer shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)]">
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
                  {[
                    { label: 'Largeur', key: 'width' },
                    { label: 'Hauteur', key: 'height' },
                    { label: 'Diamètre', key: 'diameter' },
                    { label: 'Charge', key: 'load' },
                    { label: 'Vitesse', key: 'speed' }
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-gray-800 ml-1 mb-1">{item.label}</label>
                      <div className="relative">
                        <select className="w-full appearance-none border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:border-blue-500 bg-white">
                          <option>{item.label}</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  ))}
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
                  <button className="bg-[#99A1AF] text-white font-bold py-4 px-8 rounded text-sm text-center uppercase tracking-wide hover:bg-gray-500 transition-colors shadow-sm leading-tight w-full md:w-auto">
                    SÉLECTIONNEZ<br />
                    TOUS LES ATTRIBUTS REQUIS
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
