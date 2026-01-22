import Header from "@/components/Header";
import HeroCamion from "@/components/HeroCamion";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
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
      <BrandCarousel category="Camion" />
      <BestSellers category="Camion" />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
