"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { Lock, Shield, Truck, Award, Star } from 'lucide-react';
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

  const titleToRoute: Record<string, string> = {
    'Pneus auto': '/categorie/pneus-auto',
    'Pneus moto': '/categorie/pneus-moto',
    'Pneus camion': '/categorie/pneus-camion',
    'Assurance crevaison': '/page/garantie-pneus',
    'Guide des pneus': '/guide-des-pneus',
    'Besoin d\'aide': '/besoin-aide',
    'CGV': '/conditions-generales-vente',
    'Garantie pneus': '/page/garantie-pneus',
    'Politique de confidentialité': '/politique-donnees-personnelles',
    'Mentions légales': '/mentions-legales',
    'Qui sommes-nous': '/qui-sommes-nous',
    'Devenir partenaire': '/devenir-partenaire',
    'Devenir affilié': '/devenez-affilie',
    'Espace professionnel': '/auth/login',
  };

  const getHref = (link: { slug?: string | null; url?: string | null; title?: string }) => {
    if (link.title && titleToRoute[link.title]) return titleToRoute[link.title];
    if (link.url && link.url !== '#') return link.url;
    if (link.slug) return `/page/${link.slug}`;
    return '#';
  };

  // Produits & Services - static with optional override from DB
  const produitsLinks = [
    { title: 'Pneus auto', href: '/categorie/pneus-auto' },
    { title: 'Pneus moto', href: '/categorie/pneus-moto' },
    { title: 'Pneus camion', href: '/categorie/pneus-camion' },
    { title: 'Assurance crevaison', href: '/page/garantie-pneus' },
    { title: 'Guide des pneus', href: '/guide-des-pneus' },
  ];

  const supportLinks = [
    { title: "Besoin d'aide", href: '/besoin-aide' },
    { title: 'CGV', href: '/conditions-generales-vente' },
    { title: 'Garantie pneus', href: '/page/garantie-pneus' },
    { title: 'Politique de confidentialité', href: '/politique-donnees-personnelles' },
    { title: 'Mentions légales', href: '/mentions-legales' },
  ];

  const entrepriseLinks = [
    { title: 'Qui sommes-nous', href: '/qui-sommes-nous' },
    { title: 'Devenir partenaire', href: '/devenir-partenaire' },
    { title: 'Devenir affilié', href: '/devenez-affilie' },
    { title: 'Espace professionnel', href: '/auth/login' },
  ];

  const bottomLinks = [
    { title: 'Conditions générales de vente', href: '/conditions-generales-vente' },
    { title: 'Politique de gestion des données personnelles', href: '/politique-donnees-personnelles' },
    { title: 'Mentions légales', href: '/mentions-legales' },
    { title: 'Paramètres des cookies', href: '/parametrez-les-cookies' },
  ];

  return (
    <footer className="text-gray-700 text-sm">
      {/* Upper Section - Light blue-grey */}
      <div className="bg-[#F5F7FA] pt-8 md:pt-12 pb-8 md:pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {/* PRODUITS & SERVICES */}
            <div>
              <h3 className="font-bold text-blue-900 mb-4 uppercase text-xs tracking-wider">Produits & services</h3>
              <ul className="space-y-2.5">
                {produitsLinks.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-blue-900 hover:underline">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* SUPPORT & LEGAL */}
            <div>
              <h3 className="font-bold text-blue-900 mb-4 uppercase text-xs tracking-wider">Support & legal</h3>
              <ul className="space-y-2.5">
                {supportLinks.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-blue-900 hover:underline">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ENTREPRISE */}
            <div>
              <h3 className="font-bold text-blue-900 mb-4 uppercase text-xs tracking-wider">Entreprise</h3>
              <ul className="space-y-2.5">
                {entrepriseLinks.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-blue-900 hover:underline">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* PAIEMENT SÉCURISÉ */}
            <div>
              <h3 className="font-bold text-blue-900 mb-4 uppercase text-xs tracking-wider">Paiement sécurisé</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="Visa">
                  <Image src="/visa.png" alt="Visa" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="Mastercard">
                  <Image src="/master.svg" alt="Mastercard" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="PayPal">
                  <Image src="/paypal.png" alt="PayPal" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="Apple Pay">
                  <Image src="/apple.png" alt="Apple Pay" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="American Express">
                  <Image src="/amex.png" alt="American Express" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="Google Pay">
                  <Image src="/gpay.png" alt="Google Pay" width={40} height={24} className="object-contain" />
                </Link>
                <Link href="/methodes-de-paiement" className="flex items-center justify-center w-12 h-8 bg-white border border-gray-200 rounded hover:ring-2 ring-blue-500 overflow-hidden" title="Cofidis">
                  <Image src="/cofidis.png" alt="Cofidis" width={40} height={24} className="object-contain" />
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Lock size={16} className="flex-shrink-0" />
                  <span className="font-medium text-sm">SSL Sécurisé</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Shield size={18} className="flex-shrink-0" />
                    <span className="font-medium text-sm">3X Sécurisé</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Truck size={18} className="flex-shrink-0" />
                    <span className="font-medium text-sm">Livraison rapide</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Award size={18} className="flex-shrink-0" />
                    <span className="font-medium text-sm">Garantie qualité</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section - Darker grey */}
      <div className="bg-[#E9EBEE] py-4 md:py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-3 md:gap-6 text-gray-600 text-xs mb-3">
            {bottomLinks.map((link, i) => (
              <React.Fragment key={link.title}>
                {i > 0 && <span className="hidden md:inline text-gray-400">|</span>}
                <Link href={link.href} className="hover:underline">
                  {link.title}
                </Link>
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs">
            © 2024 MecaniDoc. Tous droits réservés.
          </p>
        </div>
      </div>

      <ChatBot />
    </footer>
  );
}
