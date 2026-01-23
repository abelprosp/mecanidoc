import Header from "@/components/Header";
import HeroTractor from "@/components/HeroTractor";
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
    .eq('slug', 'tracteurs')
    .maybeSingle();
  
  return data?.product_category_filter || 'Tracteurs';
}

export default async function TractorPage() {
  const category = await getCategoryFilter();
  
  return (
    <main className="min-h-screen">
      <Header />
      <HeroTractor />
      <BrandCarousel category={category} />
      <BestSellers category={category} />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ pageSlug="tracteurs" />
      <Steps />
      <Footer />
    </main>
  );
}
