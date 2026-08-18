"use client";

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Wifi,
} from 'lucide-react';

type CredStatus = {
  configured?: boolean;
  webhookConfigured?: boolean;
  source?: 'env' | 'database' | 'mixed' | 'none';
  envLocked?: boolean;
  publishableKey?: string | null;
  hasSecretKey?: boolean;
  hasWebhookSecret?: boolean;
  livemode?: boolean;
  error?: string;
};

export default function StripeSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<CredStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/stripe/credentials', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible de lire la configuration Stripe');
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/integrations/stripe/credentials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishableKey: form.publishableKey.trim() || undefined,
          secretKey: form.secretKey.trim() || undefined,
          webhookSecret: form.webhookSecret.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible');
      setStatus(data);
      setForm({ publishableKey: '', secretKey: '', webhookSecret: '' });
      setMessage('Clés Stripe enregistrées. Vous pouvez tester la connexion.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/integrations/stripe/test-connection', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Connexion Stripe refusée');
      const mode = data.livemode ? 'live' : 'test';
      setMessage(
            `Connexion OK (${mode}).` +
          (data.hasPublishableKey ? '' : ' Attention: clé publique manquante.') +
          (data.webhookConfigured ? '' : ' Webhook secret encore optionnel (verify-session suffit en local).')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const envLocked = Boolean(status?.envLocked);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CreditCard size={18} /> Paiement Stripe
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Collez les clés depuis le Dashboard Stripe (Developers → API keys). En local utilisez
              les clés de test (<span className="font-mono">sk_test_</span> /{' '}
              <span className="font-mono">pk_test_</span>).
            </p>
          </div>
          <button
            onClick={testConnection}
            disabled={testing}
            className="border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-50 disabled:opacity-60 flex items-center gap-2"
          >
            {testing ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />}
            Tester la connexion
          </button>
        </div>

        {status && (
          <p className="text-sm mb-4 text-gray-600">
            État:{' '}
            <span className={status.configured ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {status.configured ? 'configuré' : 'non configuré'}
            </span>
            {status.source && status.source !== 'none' && (
              <> (source: {status.source === 'env' ? '.env' : status.source === 'mixed' ? '.env + panneau' : 'panneau'})</>
            )}
            {status.livemode ? ' · mode live' : status.configured ? ' · mode test' : ''}
            {status.publishableKey && <> · {status.publishableKey}</>}
          </p>
        )}

        {envLocked && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            Les variables <span className="font-mono">STRIPE_*</span> du .env ont priorité. Pour
            utiliser ce formulaire, retirez-les du .env ou mettez à jour le .env directement.
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex gap-2">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="grid gap-4 max-w-3xl">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Clé publique (pk_test_ / pk_live_)</label>
            <input
              type="text"
              value={form.publishableKey}
              onChange={(e) => setForm({ ...form, publishableKey: e.target.value })}
              placeholder={status?.publishableKey ? `Actuelle: ${status.publishableKey}` : 'pk_test_...'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              autoComplete="off"
              disabled={envLocked}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Clé secrète (sk_test_ / sk_live_)</label>
            <input
              type="password"
              value={form.secretKey}
              onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
              placeholder={status?.hasSecretKey ? '•••••••• (laissez vide pour conserver)' : 'sk_test_...'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              autoComplete="new-password"
              disabled={envLocked}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Webhook secret (whsec_) — optionnel en local
            </label>
            <input
              type="password"
              value={form.webhookSecret}
              onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
              placeholder={
                status?.hasWebhookSecret ? '•••••••• (laissez vide pour conserver)' : 'whsec_... (Stripe CLI ou Dashboard)'
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              autoComplete="new-password"
              disabled={envLocked}
            />
            <p className="text-xs text-gray-500 mt-1">
              En production: Developers → Webhooks →{' '}
              <span className="font-mono">https://votre-domaine/api/stripe/webhook</span>. En local,
              la page de succès confirme le paiement même sans webhook.
            </p>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || envLocked}
          className="mt-6 bg-[#0066CC] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
          Enregistrer les clés
        </button>
      </div>
    </div>
  );
}
