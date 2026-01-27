"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import ChatBot from './ChatBot';

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

  const reactRoutes: Record<string, string> = {
    'assurance-crevaison': '/assurance-crevaison',
    'guide-des-pneus': '/guide-des-pneus',
    'cgv': '/conditions-generales-vente',
    'conditions-generales-vente': '/conditions-generales-vente',
    'devenez-affilie': '/devenez-affilie',
    'qui-sommes-nous': '/qui-sommes-nous',
    'mentions-legales': '/mentions-legales',
    'politique-donnees-personnelles': '/politique-donnees-personnelles',
    'parametrez-les-cookies': '/parametrez-les-cookies',
  };

  const titleToRoute: Record<string, string> = {
    'Assurance crevaison': '/assurance-crevaison',
    'Guide des pneus': '/guide-des-pneus',
    'Guide des Pneus': '/guide-des-pneus',
    'Conditions générales de vente': '/conditions-generales-vente',
    'Devenez affilié': '/devenez-affilie',
    'Qui sommes-nous?': '/qui-sommes-nous',
    'Mentions légales': '/mentions-legales',
    'Politique de gestion des données personnelles': '/politique-donnees-personnelles',
    'Paramétrez les cookies': '/parametrez-les-cookies',
  };

  const getHref = (link: { slug?: string | null; url?: string | null; title?: string }) => {
    if (link.title && titleToRoute[link.title]) return titleToRoute[link.title];
    if (link.slug && reactRoutes[link.slug]) return reactRoutes[link.slug];
    if (link.url && link.url !== '#') return link.url;
    if (link.slug) return `/page/${link.slug}`;
    return '#';
  };

  return (
    <footer className="bg-gray-100 pt-8 md:pt-12 pb-6 md:pb-8 text-gray-600 text-sm">
      <div className="md:container md:mx-auto md:px-4">
        
        {/* SEO / Intro Text */}
        <div className="mb-6 md:mb-10 max-w-4xl">
          <h2 className="text-lg font-bold text-gray-800 mb-3 md:mb-4">MecaniDoc.com : Bien Plus Qu'un Service, Votre Partenaire de Confiance</h2>
          <p className="mb-3 md:mb-4 leading-relaxed">
            Chez <strong className="text-gray-800">MecaniDoc.com</strong>, nous ne nous contentons pas de vendre des pneus, nous vous offrons <strong className="text-gray-800">une expérience unique</strong>, alliant <strong className="text-gray-800">qualité, fiabilité et sérénité</strong>.
          </p>
          <p className="mb-4 md:mb-6 leading-relaxed italic">
            Engagement de Notre part ? Nous ne vous offrons pas seulement un simple achat, mais une véritable solution adaptée à vos besoins, avec :
          </p>
          
          <ul className="space-y-1.5 md:space-y-2 mb-4 md:mb-6">
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

        <hr className="border-gray-200 my-6 md:my-10" />

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-10">
          <div>
            <h3 className="font-bold text-blue-600 mb-4 uppercase text-xs tracking-wider">PRODUITS ET SERVICES</h3>
            <ul className="space-y-2 text-xs">
              {getLinks('products').map(link => (
                <li key={link.id}>
                  <Link href={getHref(link)} className="hover:text-blue-600">
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
                  <Link href={getHref(link)} className="hover:text-blue-600">
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
                  <Link href={getHref(link)} className="hover:text-blue-600">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-4 text-xs">Les moyens de paiement sécurisés</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="Visa"><span className="text-[8px] font-bold text-blue-800">VISA</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="Mastercard"><span className="text-[8px] font-bold text-red-600">MC</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="PayPal"><span className="text-[8px] font-bold text-blue-600">PayPal</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="Apple Pay"><span className="text-[8px] font-bold text-black">Apple</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="American Express"><span className="text-[8px] font-bold text-blue-700">Amex</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="Google Pay"><span className="text-[8px] font-bold text-gray-700">G Pay</span></Link>
              <Link href="/methodes-de-paiement" className="w-10 h-6 bg-white border rounded flex items-center justify-center hover:ring-2 ring-blue-500 transition-shadow" title="Paiement en 4 fois Cofidis"><span className="text-[7px] font-bold text-red-600">Cofidis</span></Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bg-gray-200 py-3 md:py-4 text-[10px] text-gray-500 text-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {getLinks('legal').slice(0, 2).map(link => (
              <Link 
                key={link.id} 
                href={getHref(link)} 
                className="hover:underline"
              >
                {link.title}
              </Link>
            ))}
          </div>
          <div className="flex justify-center">
            {getLinks('legal').slice(2, 3).map(link => (
              <Link 
                key={link.id} 
                href={getHref(link)} 
                className="hover:underline"
              >
                {link.title}
              </Link>
            ))}
          </div>
          <div className="flex justify-center">
            {getLinks('legal').slice(3, 4).map(link => (
              <Link 
                key={link.id} 
                href={getHref(link)} 
                className="hover:underline"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </footer>
  );
}
