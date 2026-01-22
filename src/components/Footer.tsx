"use client";

import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function Footer() {
  const [links, setLinks] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await supabase.from('footer_links').select('*').eq('is_active', true).order('sort_order');
      if (data) setLinks(data);
    };
    fetchLinks();
  }, []);

  const getLinks = (section: string) => links.filter(l => l.section === section);

  return (
    <footer className="bg-gray-100 pt-16 pb-8 text-gray-600 text-sm">
      <div className="container mx-auto px-4">
        
        {/* SEO / Intro Text */}
        <div className="mb-12 max-w-4xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4">MecaniDoc.com : Bien Plus Qu'un Service, Votre Partenaire de Confiance</h2>
          <p className="mb-4 leading-relaxed">
            Chez <strong className="text-gray-800">MecaniDoc.com</strong>, nous ne nous contentons pas de vendre des pneus, nous vous offrons <strong className="text-gray-800">une expérience unique</strong>, alliant <strong className="text-gray-800">qualité, fiabilité et sérénité</strong>.
          </p>
          <p className="mb-6 leading-relaxed italic">
            Engagement de Notre part ? Nous ne vous offrons pas seulement un simple achat, mais une véritable solution adaptée à vos besoins, avec :
          </p>
          
          <ul className="space-y-2 mb-8">
            <li className="flex items-center gap-2">✓ Des prix compétitifs toute l'année 💰</li>
            <li className="flex items-center gap-2">✓ Un large choix de pneus pour tous les véhicules 🚗</li>
            <li className="flex items-center gap-2">✓ Une livraison rapide et flexible 📦</li>
            <li className="flex items-center gap-2">✓ Des options de montage simplifiées chez nos partenaires 🔧</li>
            <li className="flex items-center gap-2">✓ Un service client à votre écoute <span className="text-xs text-gray-400">Pour vous accompagner à chaque étape 🛠️</span></li>
          </ul>

          <p className="text-xs text-gray-500 leading-relaxed">
            🚀 <strong>Faites le choix de la tranquillité</strong> et découvrez la <strong>différence MecaniDoc</strong>. Parce que votre sécurité et votre satisfaction sont notre priorité, nous sommes là pour <strong>vous équiper en toute confiance</strong> et vous accompagner <strong>sur la route de la performance</strong>.
          </p>
        </div>

        <hr className="border-gray-200 my-12" />

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-blue-600 mb-4 uppercase text-xs tracking-wider">PRODUITS ET SERVICES</h3>
            <ul className="space-y-2 text-xs">
              {getLinks('products').map(link => (
                <li key={link.id}>
                  <Link href={link.url || `/page/${link.slug}`} className="hover:text-blue-600">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-4 uppercase text-xs tracking-wider">TERMES ET CONDITIONS</h3>
            <ul className="space-y-2 text-xs">
              {getLinks('terms').map(link => (
                <li key={link.id}>
                  <Link href={link.url || `/page/${link.slug}`} className="hover:text-blue-600">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-4 uppercase text-xs tracking-wider">INSTITUTIONNEL</h3>
            <ul className="space-y-2 text-xs">
              {getLinks('institutional').map(link => (
                <li key={link.id}>
                  <Link href={link.url || `/page/${link.slug}`} className="hover:text-blue-600">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-4 text-xs">Les moyens de paiement sécurisés</h3>
            <div className="flex flex-wrap gap-2">
               {/* Payment Icons Simulator */}
               <div className="w-10 h-6 bg-white border rounded flex items-center justify-center"><span className="text-[8px] font-bold text-blue-800">VISA</span></div>
               <div className="w-10 h-6 bg-white border rounded flex items-center justify-center"><span className="text-[8px] font-bold text-red-600">MC</span></div>
               <div className="w-10 h-6 bg-white border rounded flex items-center justify-center"><span className="text-[8px] font-bold text-blue-600">PayPal</span></div>
               <div className="w-10 h-6 bg-white border rounded flex items-center justify-center"><span className="text-[8px] font-bold text-black">Apple</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bg-gray-200 py-4 text-[10px] text-gray-500 text-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            <Link href="/page/cgv" className="hover:underline">Conditions générales de vente</Link>
            <Link href="/page/mentions-legales" className="hover:underline">Mentions légales</Link>
          </div>
          <div>
            Politique de gestion des données personnelles
          </div>
          <div>
            Paramétrez les cookies
          </div>
        </div>
      </div>

      {/* Chat Bubble */}
      <button className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50">
        <MessageCircle size={24} />
        <span className="absolute top-0 right-0 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></span>
      </button>
    </footer>
  );
}
