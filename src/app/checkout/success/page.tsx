"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

type VerifyStatus = 'loading' | 'paid' | 'pending' | 'unpaid' | 'expired' | 'error';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const cartCleared = useRef(false);
  const attempts = useRef(0);

  const verify = useCallback(async (): Promise<VerifyStatus> => {
    if (!sessionId) {
      // Sans session_id on ne peut pas prouver le paiement
      setStatus('error');
      setMessage('Lien de confirmation invalide ou incomplet.');
      return 'error';
    }

    try {
      const res = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, orderId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Impossible de vérifier le paiement.');
        return 'error';
      }

      const next = (data.status as VerifyStatus) || 'pending';
      setStatus(next);

      if (next === 'paid') {
        setMessage('Merci pour votre commande. Votre paiement a bien été reçu.');
        if (!cartCleared.current) {
          cartCleared.current = true;
          clearCart();
        }
      } else if (next === 'expired') {
        setMessage('La session de paiement a expiré. Vous pouvez réessayer depuis le panier.');
      } else if (next === 'unpaid') {
        setMessage('Le paiement n’a pas été confirmé. Si vous avez été débité, contactez le support.');
      } else {
        setMessage('Confirmation en cours… cela peut prendre quelques secondes.');
      }

      return next;
    } catch {
      setStatus('error');
      setMessage('Erreur réseau lors de la vérification du paiement.');
      return 'error';
    }
  }, [sessionId, orderId, clearCart]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      const result = await verify();
      if (cancelled) return;

      // Poll léger si le webhook / Stripe n’a pas encore finalisé
      if ((result === 'pending' || result === 'unpaid') && attempts.current < 5) {
        attempts.current += 1;
        timer = setTimeout(run, 2000);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [verify]);

  const displayOrderRef = orderId ? `${orderId.slice(0, 8)}…` : null;

  return (
    <div className="layout-container py-20 text-center">
      <div className="bg-white rounded-xl shadow-sm p-12 max-w-2xl mx-auto">
        {status === 'loading' || status === 'pending' ? (
          <>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="text-[#0066CC] animate-spin" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Confirmation en cours</h1>
            <p className="text-gray-600 mb-8">{message || 'Vérification de votre paiement…'}</p>
          </>
        ) : null}

        {status === 'paid' ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Commande confirmée !</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {displayOrderRef && (
              <p className="text-sm text-gray-500 mb-6">
                Référence : <span className="font-mono">{displayOrderRef}</span>
              </p>
            )}
            <p className="text-gray-600 mb-8">
              Vous pouvez suivre votre commande depuis votre espace client.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/client"
                className="inline-block bg-[#0066CC] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Mon espace
              </Link>
              <Link
                href="/"
                className="inline-block border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                Retour à la boutique
              </Link>
            </div>
          </>
        ) : null}

        {status === 'expired' || status === 'unpaid' ? (
          <>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-amber-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Paiement non confirmé</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link
              href="/checkout"
              className="inline-block bg-[#40C4E7] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#3bb0cf] transition-colors"
            >
              Retour au checkout
            </Link>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Vérification impossible</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/client"
                className="inline-block bg-[#0066CC] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Voir mes commandes
              </Link>
              <Link
                href="/checkout"
                className="inline-block border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                Retour au checkout
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      <Suspense
        fallback={
          <div className="layout-container py-20 flex justify-center">
            <Loader2 className="animate-spin text-[#0066CC]" size={32} />
          </div>
        }
      >
        <CheckoutSuccessContent />
      </Suspense>
      <Footer />
    </main>
  );
}
