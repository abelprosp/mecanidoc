"use client";

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    // Limpar o carrinho ao exibir a página de sucesso (pagamento concluído)
    clearCart();
  }, [clearCart]);

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <div className="layout-container py-20 text-center">
        <div className="bg-white rounded-xl shadow-sm p-12 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="text-green-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Commande Confirmée !</h1>
          <p className="text-gray-600 mb-4">
            Merci pour votre commande. Votre paiement a bien été reçu.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-6">
              Référence : <span className="font-mono">{orderId.slice(0, 8)}...</span>
            </p>
          )}
          <p className="text-gray-600 mb-8">
            Vous recevrez un email de confirmation sous peu.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#0066CC] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Retour à la boutique
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
