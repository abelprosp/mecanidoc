"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Lock, Mail, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function safeRedirect(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}

const VERIFIED_MESSAGES: Record<string, { kind: 'ok' | 'error'; text: string }> = {
  ok: { kind: 'ok', text: 'Adresse e-mail confirmée. Vous pouvez vous connecter.' },
  expired: { kind: 'error', text: 'Ce lien de confirmation a expiré. Connectez-vous puis demandez un nouvel e-mail depuis « Sécurité ».' },
  invalid: { kind: 'error', text: 'Lien de confirmation invalide ou déjà utilisé.' },
  error: { kind: 'error', text: 'Impossible de confirmer votre e-mail pour le moment.' },
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfa, setMfa] = useState<{ challenge: string; code: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const verifiedMsg = VERIFIED_MESSAGES[searchParams.get('verified') || ''] || null;
  const supabase = createClient();

  const goAfterLogin = async (userId: string) => {
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const role = profile?.role || 'customer';
    switch (role) {
      case 'master':
        router.push('/dashboard/admin');
        break;
      case 'supplier':
        router.push('/dashboard/fournisseur');
        break;
      case 'garage':
        router.push('/dashboard/garage');
        break;
      case 'company':
        router.push('/dashboard/entreprise');
        break;
      default:
        router.push('/dashboard/client');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const emailTrimmed = email.trim().toLowerCase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: emailTrimmed, password });
      if (signInError) throw new Error(signInError.message || 'Erreur lors de la connexion');

      if ('mfaRequired' in data && data.mfaRequired) {
        setMfa({ challenge: data.challenge, code: '' });
        return;
      }
      if (data.user) await goAfterLogin(data.user.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: mfaError } = await supabase.auth.verifyMfa(mfa.challenge, mfa.code);
      if (mfaError) {
        // Desafio expirado → voltar ao início
        if (/expir/i.test(mfaError.message)) setMfa(null);
        throw new Error(mfaError.message);
      }
      if (data.user) await goAfterLogin(data.user.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  if (mfa) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="flex justify-center mb-8">
            <Link href="/" aria-label="Retour à l'accueil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="MecaniDoc" className="h-12 w-auto object-contain" />
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Vérification en deux étapes</h1>
          <p className="text-gray-500 text-center mb-8 text-sm">Saisissez le code à 6 chiffres de votre application d&apos;authentification, ou un code de récupération.</p>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm" role="alert">
              <AlertCircle size={16} aria-hidden /> {error}
            </div>
          )}
          <form onSubmit={handleMfa} className="space-y-6">
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400" aria-hidden />
                </div>
                <input
                  id="mfa-code"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfa.code}
                  onChange={(e) => setMfa({ ...mfa, code: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 font-mono tracking-widest"
                  placeholder="123 456"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading || !mfa.code.trim()} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[#0066CC] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="animate-spin" aria-label="Vérification" /> : 'Valider'}
            </button>
            <button type="button" onClick={() => { setMfa(null); setError(null); }} className="w-full text-sm text-gray-500 hover:text-gray-800">
              Retour
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Retour à l'accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="MecaniDoc" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Bon retour !</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Connectez-vous à votre espace personnel</p>

        {verifiedMsg && !error && (
          <div className={`p-3 rounded-lg flex items-center gap-2 mb-6 text-sm ${verifiedMsg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`} role="status">
            {verifiedMsg.kind === 'ok' ? <CheckCircle2 size={16} aria-hidden /> : <AlertCircle size={16} aria-hidden />}
            {verifiedMsg.text}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm" role="alert">
            <AlertCircle size={16} aria-hidden />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" aria-hidden />
              </div>
              <input
                id="login-email"
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

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" aria-hidden />
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#0066CC] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Se connecter"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link
              href={redirectTo ? `/auth/register/client?redirect=${encodeURIComponent(redirectTo)}` : '/auth/register/client'}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Créer un compte
            </Link>
          </p>
          <Link href="/auth/forgot-password" className="block text-sm text-blue-600 hover:text-blue-800">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" aria-label="Chargement" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
