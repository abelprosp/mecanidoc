"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

const TIRE_IMAGE_URL = 'https://www.gpservicosautomotivos.com.br/wp-content/uploads/2022/06/pneus.png';

// Conteúdo estático de fallback quando a página não existe na BD (garantia pneus / garantie MecaniDoc)
const STATIC_GARANTIE_PNEUS = (
  <div className="flex-1 bg-[#F1F1F1] py-6 md:py-10">
    <div className="layout-container">
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase tracking-tight">Assurance Crevaison Mecanidoc</h1>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          Pour seulement <strong className="text-gray-900">5,50 € par pneu</strong>, bénéficiez d&apos;une couverture complète contre les crevaisons et les hernies.
        </p>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4 text-gray-700">
            <p>Remboursement total le premier mois, garantie 12 mois, protection pour toutes les marques.</p>
            <a href="/assurance-crevaison" className="text-[#0066CC] hover:underline font-medium">Consulter les conditions d&apos;application →</a>
          </div>
          <div className="flex-shrink-0 w-full md:w-80">
            <img src={TIRE_IMAGE_URL} alt="Pneus MecaniDoc" className="w-full h-auto object-contain rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const STATIC_GARANTIE_MECANIDOC = (
  <div className="flex-1 bg-[#F1F1F1] flex flex-col">
    <div className="bg-[#0066CC] text-white py-12">
      <div className="layout-container text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 uppercase tracking-wide">La Garantie MecaniDoc</h1>
      </div>
    </div>
    <div className="layout-container py-8 flex-1">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 uppercase">GARANTIE MECANIDOC</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Votre pneu <strong className="text-gray-900">remplacé ou remboursé</strong> en toute sérénité en cas de dommage !
            </p>
            <p className="text-gray-600 text-sm">Dommages accidentels, défauts de fabrication, assistance. Roulez en toute confiance.</p>
          </div>
          <div className="flex items-center justify-center">
            <img src={TIRE_IMAGE_URL} alt="Pneus MecaniDoc" className="w-full max-w-sm h-auto object-contain rounded-lg shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string | undefined;
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) return;
      const { data } = await supabase.from('footer_links').select('*').eq('slug', slug).single();
      setPage(data);
      setLoading(false);
    };
    fetchPage();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  // Fallback estático para páginas de garantia quando não existem na BD ou estão inativas
  if (!page && (slug === 'garantie-pneus' || slug === 'garantie-mecanidoc')) {
    return (
      <main className="min-h-screen flex flex-col bg-[#F1F1F1]">
        <Header />
        {slug === 'garantie-pneus' ? STATIC_GARANTIE_PNEUS : STATIC_GARANTIE_MECANIDOC}
        <Footer />
      </main>
    );
  }

  if (!page) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 layout-container py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Page non trouvée</h1>
        </div>
        <Footer />
      </main>
    );
  }

  // Corrigir URL da imagem de pneus nos conteúdos de garantia (evitar imagens partidas)
  let content = page.content || '';
  if (content && (slug === 'garantie-pneus' || slug === 'garantie-mecanidoc')) {
    content = content.replace(/https:\/\/images\.unsplash\.com\/[^"'\s]+/g, TIRE_IMAGE_URL);
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        {content ? (
          <div className="bg-[#F1F1F1] py-8 md:py-12">
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              className="footer-page-html layout-container w-full rounded-2xl bg-white shadow-sm border border-gray-100 px-5 py-8 sm:px-8 md:px-10 md:py-10 text-gray-800
                [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-4 [&_h1]:mt-0
                [&_h2]:text-xl md:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:first:mt-0
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:mb-4 [&_p]:text-[15px] md:[&_p]:text-base [&_p]:leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:text-[15px] md:[&_ul]:text-base
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:text-[15px] md:[&_ol]:text-base
                [&_li]:marker:text-gray-400
                [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800
                [&_strong]:text-gray-900 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg"
            />
          </div>
        ) : (
          <div className="layout-container py-12">
            <article className="prose prose-lg max-w-none w-full">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
              <p className="text-gray-600">Cette page est en cours de rédaction. Le contenu sera bientôt disponible.</p>
            </article>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
