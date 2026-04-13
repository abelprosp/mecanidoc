import Header from "@/components/Header";
import HeroCamion from "@/components/HeroCamion";
import BrandCarousel from "@/components/BrandCarousel";
import HomeOffersCarousels from "@/components/HomeOffersCarousels";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";
import { MAIN_ROUTE_PRODUCT_CATEGORY } from '@/lib/main-page-product-category';

export default async function CamionPage() {
  const category = MAIN_ROUTE_PRODUCT_CATEGORY.camion;
  
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <HeroCamion category={category} />
      <BrandCarousel category={category} />
      <HomeOffersCarousels categoryFilter={category} />
      <BestSellers category={category} />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ pageSlug="camion" />
      <Steps />
      <Footer />
    </main>
  );
}
