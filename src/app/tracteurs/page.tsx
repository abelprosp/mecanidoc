import Header from "@/components/Header";
import HeroTractor from "@/components/HeroTractor";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";
import { MAIN_ROUTE_PRODUCT_CATEGORY } from '@/lib/main-page-product-category';

export default async function TractorPage() {
  const category = MAIN_ROUTE_PRODUCT_CATEGORY.tracteurs;
  
  return (
    <main className="min-h-screen">
      <Header />
      <HeroTractor category={category} />
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
