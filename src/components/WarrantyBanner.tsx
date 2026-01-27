"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function WarrantyBanner() {
  return (
    <section className="py-2 md:py-3 bg-[#F1F1F1]">
      <div className="md:container md:mx-auto md:px-4">
        {/* Card de Garantia */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          
          {/* Cabeçalho Azul */}
          <div className="bg-[#0066CC] py-2 md:py-3 px-4 md:px-6">
            <h2 className="text-white font-bold text-center text-base md:text-lg">
              La Garantie MecaniDoc
            </h2>
          </div>

          {/* Conteúdo Principal */}
          <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            
            {/* Lado Esquerdo: Texto */}
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 uppercase mb-2 md:mb-4 tracking-tight">
                GARANTIE MECANIDOC
              </h3>
              <p className="text-gray-500 text-sm md:text-base mb-2 md:mb-4 leading-relaxed">
                Votre pneu <strong className="text-gray-700 font-bold">remplacé ou remboursé</strong> en toute sérénité en cas de dommage !
              </p>
              <Link 
                href="/page/garantie-mecanidoc" 
                className="inline-flex items-center gap-2 text-[#0066CC] hover:text-[#004499] font-medium text-sm md:text-base transition-colors"
              >
                En savoir plus <ArrowRight size={16} />
              </Link>
            </div>

            {/* Lado Direito: Imagem dos Pneus */}
            <div className="flex-shrink-0 w-full md:w-80 lg:w-96">
              <img 
                src="/warranty-tires.png" 
                alt="Pneus MecaniDoc" 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  // Fallback se a imagem não existir
                  e.currentTarget.src = 'https://www.gpservicosautomotivos.com.br/wp-content/uploads/2022/06/pneus.png';
                }}
              />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
