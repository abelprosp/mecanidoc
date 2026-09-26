"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Impossible de réinitialiser le mot de passe.');
        return;
      }
      setDone(true);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm" role="alert">
        Lien invalide. <Link href="/auth/forgot-password" className="underline font-medium">Faire une nouvelle demande</Link>.
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 text-sm" role="status">
        <CheckCircle2 size={20} className="shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-semibold">Mot de passe mis à jour.</p>
          <Link href="/auth/login" className="inline-block mt-3 font-medium text-blue-600 hover:text-blue-800">Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm" role="alert">
          <AlertCircle size={16} aria-hidden />
          {error}
        </div>
      )}
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" aria-hidden />
          </div>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            required
            aria-describedby="password-help"
          />
        </div>
        <p id="password-help" className="mt-1 text-xs text-gray-500">Au moins 8 caractères, avec une lettre et un chiffre.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[#0066CC] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="animate-spin" aria-label="Enregistrement" /> : 'Enregistrer le nouveau mot de passe'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Retour à l'accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="MecaniDoc" className="h-12 w-auto object-contain" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Nouveau mot de passe</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">Choisissez un nouveau mot de passe pour votre compte.</p>
        <Suspense fallback={<Loader2 className="animate-spin mx-auto text-gray-400" aria-label="Chargement" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
