import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function getCategoryFilter() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('category_pages')
    .select('product_category_filter')
    .eq('slug', 'auto')
    .maybeSingle();
  
  return data?.product_category_filter || 'Auto';
}

export default async function Home() {
  const category = await getCategoryFilter();
  
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <BrandCarousel category={category} />
      <BestSellers category={category} />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
