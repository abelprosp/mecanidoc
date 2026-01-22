import Header from "@/components/Header";
import HeroCamion from "@/components/HeroCamion";
import BrandCarouselCamion from "@/components/BrandCarouselCamion";
import BestSellersCamion from "@/components/BestSellersCamion";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";

export default function CamionPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroCamion />
      <BrandCarouselCamion />
      <BestSellersCamion />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
