"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryHero from "@/components/CategoryHero";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import FAQ from "@/components/FAQ";
import { useParams } from 'next/navigation';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Helper to format slug to display title
  const formatTitle = (slug: string) => {
    return slug.replace(/-/g, ' ').toUpperCase();
  };

  // Helper to map slug to DB category (simple mapping for now)
  // In a real app, you might have a DB table for categories mapping slugs to IDs/Filters
  const getCategoryFilter = (slug: string) => {
    if (slug.includes('moto')) return 'Moto';
    if (slug.includes('camion')) return 'Camion';
    if (slug.includes('agricole') || slug.includes('tracteur')) return 'Tracteurs';
    return 'Auto'; // Default
  };

  const [pageData, setPageData] = useState<any>(null);
  const [subcategoryData, setSubcategoryData] = useState<any>(null);
  
  useEffect(() => {
    const fetchPageData = async () => {
      const supabase = createClient();
      
      // Primeiro, tentar buscar na tabela category_pages
      const { data: categoryPage } = await supabase.from('category_pages').select('*').eq('slug', slug).maybeSingle();
      
      // Se não encontrou, buscar na tabela menu_subcategories
      if (!categoryPage) {
        const { data: subcategory } = await supabase.from('menu_subcategories').select('*').eq('slug', slug).maybeSingle();
        setSubcategoryData(subcategory);
        setPageData(null);
      } else {
        setPageData(categoryPage);
        setSubcategoryData(null);
      }
    };
    if (slug) fetchPageData();
  }, [slug]);

  // Se for subcategoria do menu, usar dados dela; senão usar category_pages
  const title = pageData?.seo_title || subcategoryData?.name || formatTitle(slug);
  const heroImage = pageData?.hero_image;
  const categoryFilter = pageData?.product_category_filter || subcategoryData?.product_category_filter || getCategoryFilter(slug);
  // Se for subcategoria do menu, usar o nome como pa_tipo para filtrar produtos
  const paTipoFilter = subcategoryData?.name || null;
  const promoBanners = pageData?.promo_banners || [];
  const marketingBanner = pageData?.marketing_banner || {};

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      
      <div className="md:container md:mx-auto">
        <CategoryHero title={title} subtitle="Trouvez le pneu parfait pour votre véhicule" image={heroImage} category={categoryFilter} paTipo={paTipoFilter} />
        
        {/* Brand Carousel */}
        <BrandCarousel category={categoryFilter} paTipo={paTipoFilter} />
        
        {/* SEO Text Block */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 md:mb-6 md:mx-4 shadow-sm text-gray-600 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-gray-800 mb-3 md:mb-4">Tout savoir sur {title}</h2>
          <p className="mb-3 md:mb-4 whitespace-pre-wrap">{pageData?.seo_text || `Découvrez notre large gamme de ${title.toLowerCase()}. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.`}</p>
        </section>

        {/* Promo Banners */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6 md:mx-4">
           {promoBanners.length > 0 ? promoBanners.map((banner: any, idx: number) => (
             <div key={idx} className="bg-gray-900 rounded-xl p-6 text-white flex flex-col justify-center h-32 relative overflow-hidden">
                <div className="relative z-10">
                   {banner.badge_text && <span className={`text-xs font-bold bg-${banner.badge_color || 'red'}-600 px-2 py-1 rounded inline-block mb-2`}>{banner.badge_text}</span>}
                   <h3 className="font-bold text-lg">{banner.title}</h3>
                   <p className="text-xs opacity-80">{banner.subtitle}</p>
                </div>
                {banner.image && <img src={banner.image} className="absolute right-0 top-0 h-full w-full object-cover opacity-20 mix-blend-overlay" />}
             </div>
           )) : (
             <>
               {/* Default Placeholders if no data */}
               <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white flex flex-col justify-center h-32 relative overflow-hidden">
                  <div className="relative z-10">
                     <span className="text-xs font-bold bg-red-600 px-2 py-1 rounded inline-block mb-2">PROMO</span>
                     <h3 className="font-bold text-lg">Jusqu'à 80€ remboursés</h3>
                     <p className="text-xs opacity-80">Sur les pneus Hankook</p>
                  </div>
               </div>
               <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white flex flex-col justify-center h-32 relative overflow-hidden">
                  <div className="relative z-10">
                     <span className="text-xs font-bold bg-orange-500 px-2 py-1 rounded inline-block mb-2">OFFRE</span>
                     <h3 className="font-bold text-lg">Montage offert</h3>
                     <p className="text-xs opacity-80">Pour l'achat de 4 pneus Vredestein</p>
                  </div>
               </div>
               <div className="bg-gradient-to-r from-gray-800 to-black rounded-xl p-6 text-white flex flex-col justify-center h-32 relative overflow-hidden">
                  <div className="relative z-10">
                     <span className="text-xs font-bold bg-green-600 px-2 py-1 rounded inline-block mb-2">CARBURANT</span>
                     <h3 className="font-bold text-lg">100€ Offerts</h3>
                     <p className="text-xs opacity-80">En chèques carburant Michelin</p>
                  </div>
               </div>
             </>
           )}
        </section>

        {/* Best Sellers */}
        <BestSellers category={categoryFilter} paTipo={paTipoFilter} />

        {/* Marketing Banner */}
        <section className="mb-4 md:mb-6 md:mx-4">
           <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl p-4 md:p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden">
              {marketingBanner.image && <img src={marketingBanner.image} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
              <div className="mb-4 md:mb-0 relative z-10">
                 <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-1 md:mb-2">{marketingBanner.title || `Nouveauté ${title}`}</h2>
                 <p className="text-red-100 max-w-xl">{marketingBanner.text || "Découvrez la dernière génération de pneus conçus pour une adhérence optimale dans toutes les conditions."}</p>
              </div>
              <button className="bg-white text-red-700 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide shadow-md relative z-10">
                 En savoir plus
              </button>
           </div>
        </section>

        {/* FAQ */}
        <div className="md:mx-4">
           <FAQ pageSlug={slug} />
        </div>

        {/* Warranty */}
        <WarrantyBanner />
        
      </div>
      <Footer />
    </main>
  );
}
