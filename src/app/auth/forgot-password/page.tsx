"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        return;
      }
      setSent(true);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Retour à l'accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="MecaniDoc" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Mot de passe oublié</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Indiquez votre adresse e-mail. Si un compte existe, vous recevrez un lien de réinitialisation valable 1 heure.
        </p>

        {sent ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 text-sm" role="status">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">Demande enregistrée.</p>
              <p className="mt-1">Si un compte existe pour <strong>{email}</strong>, un e-mail vient d&apos;être envoyé. Vérifiez aussi vos courriers indésirables.</p>
              <Link href="/auth/login" className="inline-block mt-3 font-medium text-blue-600 hover:text-blue-800">Retour à la connexion</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm" role="alert">
                <AlertCircle size={16} aria-hidden />
                {error}
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden />
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[#0066CC] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" aria-label="Envoi" /> : 'Envoyer le lien'}
            </button>
            <p className="text-center text-sm">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800">Retour à la connexion</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
