import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col bg-[#F1F1F1]">
      <Header />
      <div className="flex-1 layout-container py-20 text-center">
        <p className="text-sm font-semibold text-[#0066CC] mb-2">Erreur 404</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page introuvable</h1>
        <p className="text-gray-600 mb-8">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="px-5 py-3 rounded-lg bg-[#0066CC] text-white font-medium hover:bg-blue-700 transition-colors">
            Retour à l&apos;accueil
          </Link>
          <Link href="/search" className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors">
            Rechercher un pneu
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
