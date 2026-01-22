import Header from "@/components/Header";
import HeroTractor from "@/components/HeroTractor";
import BrandCarouselTractor from "@/components/BrandCarouselTractor";
import BestSellersTractor from "@/components/BestSellersTractor";
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
      <BrandCarouselTractor />
      <BestSellersTractor />
      <WarrantyBanner />
      <DeliveryModes />
      <FAQ />
      <Steps />
      <Footer />
    </main>
  );
}
