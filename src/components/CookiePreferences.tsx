"use client";

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mecanidoc_cookie_prefs';

export type CookiePrefs = {
  analytics: boolean;
  ads: boolean;
};

const DEFAULTS: CookiePrefs = { analytics: false, ads: false };

export function readCookiePrefs(): CookiePrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CookiePrefs>;
    return {
      analytics: Boolean(parsed.analytics),
      ads: Boolean(parsed.ads),
    };
  } catch {
    return DEFAULTS;
  }
}

function writeCookiePrefs(prefs: CookiePrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('mecanidoc:cookie-prefs', { detail: prefs }));
}

function Toggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
        disabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
      }`}
    >
      <span>
        <span className="block font-semibold text-gray-900">{label}</span>
        <span className="block text-sm text-gray-600 mt-1">{description}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-5 w-5 accent-blue-700"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </label>
  );
}

export default function CookiePreferences() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(readCookiePrefs());
  }, []);

  const save = (next: CookiePrefs) => {
    setPrefs(next);
    writeCookiePrefs(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="mt-8 space-y-3" aria-labelledby="cookie-prefs-title">
      <h2 id="cookie-prefs-title" className="text-lg font-bold text-gray-900">
        Vos préférences
      </h2>
      <Toggle
        id="cookie-essential"
        label="Cookies techniques"
        description="Session, panier et authentification. Obligatoires pour le fonctionnement du site."
        checked
        disabled
      />
      <Toggle
        id="cookie-analytics"
        label="Mesure d’audience"
        description="Nous aide à comprendre quelles pages sont utiles. Désactivé par défaut."
        checked={prefs.analytics}
        onChange={(analytics) => save({ ...prefs, analytics })}
      />
      <Toggle
        id="cookie-ads"
        label="Publicité et partenaires"
        description="Personnalisation d’offres et mesure de campagnes. Désactivé par défaut."
        checked={prefs.ads}
        onChange={(ads) => save({ ...prefs, ads })}
      />
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => save({ analytics: true, ads: true })}
        >
          Tout accepter
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          onClick={() => save({ analytics: false, ads: false })}
        >
          Tout refuser
        </button>
      </div>
      {saved ? (
        <p className="text-sm text-green-700" role="status">
          Préférences enregistrées sur cet appareil.
        </p>
      ) : null}
    </section>
  );
}
