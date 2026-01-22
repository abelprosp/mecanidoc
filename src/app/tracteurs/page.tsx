import Header from "@/components/Header";
import HeroTractor from "@/components/HeroTractor";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";

export default function TractorPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroTractor />
      <BrandCarousel category="Tracteur" />
      <BestSellers category="Tracteur" />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
