import Header from "@/components/Header";
import HeroMoto from "@/components/HeroMoto";
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
    .eq('slug', 'moto')
    .maybeSingle();
  
  return data?.product_category_filter || 'Moto';
}

export default async function MotoPage() {
  const category = await getCategoryFilter();
  
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <HeroMoto />
      <BrandCarousel category={category} />
      <BestSellers category={category} />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ pageSlug="moto" />
      <Steps />
      <Footer />
    </main>
  );
}
