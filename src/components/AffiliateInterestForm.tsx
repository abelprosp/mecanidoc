"use client";

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AffiliateInterestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/affiliate/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, site, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Impossible d’envoyer la demande.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’envoyer la demande.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800" role="status">
        Merci. Nous avons bien reçu votre demande et vous recontacterons à l’adresse indiquée.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div>
        <label htmlFor="aff-name" className="mb-1 block text-sm font-semibold text-gray-800">
          Nom / société
        </label>
        <input
          id="aff-name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="aff-email" className="mb-1 block text-sm font-semibold text-gray-800">
          E-mail
        </label>
        <input
          id="aff-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="aff-site" className="mb-1 block text-sm font-semibold text-gray-800">
          Site ou réseau (optionnel)
        </label>
        <input
          id="aff-site"
          maxLength={300}
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="aff-msg" className="mb-1 block text-sm font-semibold text-gray-800">
          Message
        </label>
        <textarea
          id="aff-msg"
          required
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
        Envoyer ma demande
      </button>
    </form>
  );
}
