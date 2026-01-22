"use client";

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: "Quelles sont les catégories de pneus disponibles ?",
    answer: "Les pneus se déclinent en plusieurs catégories : été, hiver, toutes saisons, runflat, et spécifiques pour 4x4, SUV, motos et utilitaires. Chaque type de pneu est conçu pour répondre à des conditions de conduite et des besoins spécifiques."
  },
  {
    question: "Quelle est la réglementation sur les pneus ?",
    answer: "La réglementation impose des normes strictes concernant l'usure (profondeur minimale des sculptures de 1,6 mm), l'adéquation saisonnière (pneus hiver obligatoires dans certaines zones) et l'interdiction de monter des pneus de structures différentes sur un même essieu."
  },
  {
    question: "Comment permuter les pneus ?",
    answer: "Pour assurer une usure uniforme, il est recommandé de permuter les pneus tous les 10 000 à 12 000 km. La méthode de permutation dépend du type de transmission (traction, propulsion ou 4 roues motrices) et du profil des pneus (directionnel ou asymétrique)."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-bold text-gray-500 mb-8 uppercase tracking-wide">QUESTIONS FRÉQUENTES SUR LES PNEUS</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-100 pb-4">
              <button 
                className="w-full flex items-center gap-4 text-left py-2 focus:outline-none group"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {openIndex === index ? (
                  <Minus size={16} className="text-gray-800 flex-shrink-0" />
                ) : (
                  <Plus size={16} className="text-gray-800 flex-shrink-0" />
                )}
                <span className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                  {faq.question}
                </span>
              </button>
              
              {openIndex === index && (
                <div className="mt-2 pl-8 text-gray-500 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
