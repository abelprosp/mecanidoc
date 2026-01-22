import Header from "@/components/Header";
import HeroMoto from "@/components/HeroMoto";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";

export default function MotoPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <HeroMoto />
      <BrandCarousel category="Moto" />
      <BestSellers category="Moto" />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
