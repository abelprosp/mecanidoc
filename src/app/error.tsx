"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Erreur non gérée:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F1F1F1] p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Une erreur est survenue</h1>
        <p className="text-gray-600 text-sm mb-6">
          Nous n&apos;avons pas pu afficher cette page. Réessayez dans quelques instants.
          {error.digest && <span className="block mt-2 text-xs text-gray-400">Référence : {error.digest}</span>}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="px-5 py-3 rounded-lg bg-[#0066CC] text-white font-medium hover:bg-blue-700 transition-colors">
            Réessayer
          </button>
          <Link href="/" className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors">
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
