"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp } from "lucide-react";

const QUESTIONS: { q: string; a: string }[] = [
  { q: "Quelles sont les catégories de pneus disponibles ?", a: "MecaniDoc propose des pneus Auto, Moto, Camion et Agricoles (tracteurs). Chaque catégorie comprend des sous-catégories (été, hiver, 4 saisons, etc.) adaptées à votre usage." },
  { q: "Quelle est la réglementation sur les pneus ?", a: "En France et en Suisse, les pneus doivent respecter des normes de sécurité (indices de charge, vitesse, usure). Les pneus hiver sont obligatoires dans certaines conditions. Consultez la législation locale selon votre pays." },
  { q: "Comment permuter les pneus ?", a: "La permutation régulière (avant/arrière, gauche/droite) permet une usure homogène. Elle est recommandée tous les 10 000 à 15 000 km. Respectez le sens de montage indiqué sur le flanc du pneu." },
  { q: "Comment vérifier et ajuster la pression des pneus ?", a: "Vérifiez la pression à froid, au moins une fois par mois. La valeur recommandée figure sur l'étiquette de la portière ou dans le carnet d'entretien. Une pression incorrecte accélère l'usure et augmente la consommation." },
  { q: "Comment changer une roue ?", a: "Garez-vous sur un sol plat, serrez le frein à main, dévissez les écrous en croix, placez la cale, démontez la roue et montez la roue de secours. Resserrez les écrous une fois le véhicule au sol." },
  { q: "Quand faut-il changer ses pneus ?", a: "Changez vos pneus lorsque la profondeur des sculptures atteint 1,6 mm (témoin d'usure), en cas de dommage (coupure, hernie, déformation) ou après 10 ans, même si l'usure semble faible." },
  { q: "Pourquoi le caoutchouc des pneus se craquèle-t-il ?", a: "Le craquelage (fissures sur les flancs) est souvent dû à l'âge, à l'exposition aux UV, au sous-gonflage ou au stockage prolongé. Il réduit la résistance du pneu : faites contrôler par un professionnel." },
  { q: "Qu'est-ce que le témoin d'usure et comment le repérer ?", a: "Le témoin d'usure est une petite bosse dans les rainures du pneu. Quand la bande de roulement est au niveau du témoin (1,6 mm), le pneu doit être remplacé. Repérez le symbole TWI sur le flanc." },
  { q: "Quels sont les avantages du gonflage à l'azote ?", a: "L'azote garde une pression plus stable (moins de variation avec la chaleur), limite l'oxydation interne et peut légèrement réduire la consommation. Idéal pour les pneus à long terme ou les véhicules peu utilisés." },
  { q: "Pourquoi et comment faire le rodage de nouveaux pneus ?", a: "Le rodage permet à la gomme de s'adapter et d'optimiser l'adhérence. Évitez les accélérations et freinages brutaux sur les 300 à 500 premiers kilomètres. Conduisez prudemment surtout par temps humide." },
  { q: "Quels sont les signes d'usure excessive d'un pneu ?", a: "Usure irrégulière (côté intérieur/extérieur), sculptures à plat, craquelures, hernies, coupures, vibrations. Un professionnel peut diagnostiquer l'usure et les causes (géométrie, pression, charge)." },
  { q: "Comment bien stocker ses pneus ?", a: "Stockez à l'abri de la lumière, de l'humidité et des hydrocarbures. Posez les pneus à plat ou debout, jamais en pile prolongée. Nettoyez-les avant stockage. Idéal : local frais et sec." },
  { q: "Quels sont les avantages des pneus rechapés ?", a: "Les pneus rechapés offrent un coût réduit et une seconde vie à la carcasse. Ils conviennent surtout aux poids lourds et engins agricoles. La qualité dépend du procédé et du respect des normes." },
];

export default function GuideDesPneusPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Guide des Pneus : Questions et Réponses
          </h1>

          <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
            {QUESTIONS.map((item, index) => (
              <div
                key={index}
                className="border-b border-gray-200 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 text-left px-4 py-4 md:px-6 md:py-5 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 text-sm md:text-base pr-4">
                    {item.q}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-4 pb-4 md:px-6 md:pb-5 pt-0 md:pt-0">
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed pl-0">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
