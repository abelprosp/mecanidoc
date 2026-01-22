import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BrandCarousel from "@/components/BrandCarousel";
import BestSellers from "@/components/BestSellers";
import WarrantyBanner from "@/components/WarrantyBanner";
import DeliveryModes from "@/components/DeliveryModes";
import FAQ from "@/components/FAQ";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <BrandCarousel />
      <BestSellers category="Auto" />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
