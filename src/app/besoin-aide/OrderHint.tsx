"use client";

import { useSearchParams } from 'next/navigation';

export default function OrderHint() {
  const order = useSearchParams().get('order');
  if (!order) return null;
  return (
    <p className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      Demande liée à la commande <span className="font-mono font-semibold">{order}</span>. Mentionnez ce numéro dans le chat pour un traitement plus rapide.
    </p>
  );
}
