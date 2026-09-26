"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, LogOut, MailCheck, ShieldCheck, ShieldOff } from 'lucide-react';

type Security = {
  email: string;
  emailConfirmed: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  recoveryCodesLeft: number;
};

type Setup = { secret: string; otpauth: string; qrDataUrl: string };

async function postJson<T = Record<string, unknown>>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

/**
 * Secção "Sécurité" da conta: confirmação de e-mail, double authentification (TOTP)
 * e revogação de sessões. Usa /api/auth/me, /api/auth/mfa/*, /api/auth/logout-all.
 */
export default function SecuritySettings() {
  const router = useRouter();
  const [security, setSecurity] = useState<Security | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [resending, setResending] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableForm, setDisableForm] = useState<{ open: boolean; password: string; code: string }>({ open: false, password: '', code: '' });
  const [regenCode, setRegenCode] = useState('');
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setSecurity(json.security);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resend = async () => {
    setResending(true);
    setNotice(null);
    const { ok, data } = await postJson('/api/auth/resend-verification');
    setNotice(ok ? { kind: 'ok', text: 'E-mail de confirmation envoyé. Vérifiez votre boîte de réception.' } : { kind: 'error', text: data.error || 'Envoi impossible.' });
    setResending(false);
  };

  const startSetup = async () => {
    setBusy(true);
    setNotice(null);
    const { ok, data } = await postJson<Setup>('/api/auth/mfa/setup');
    if (ok) setSetup(data);
    else setNotice({ kind: 'error', text: data.error || 'Impossible de démarrer la configuration.' });
    setBusy(false);
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { ok, data } = await postJson<{ recoveryCodes: string[] }>('/api/auth/mfa/enable', { code: setupCode });
    if (ok) {
      setRecoveryCodes(data.recoveryCodes);
      setSetup(null);
      setSetupCode('');
      setNotice({ kind: 'ok', text: 'Double authentification activée.' });
      await load();
    } else {
      setNotice({ kind: 'error', text: data.error || 'Code incorrect.' });
    }
    setBusy(false);
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { ok, data } = await postJson('/api/auth/mfa/disable', { password: disableForm.password, code: disableForm.code });
    if (ok) {
      setDisableForm({ open: false, password: '', code: '' });
      setNotice({ kind: 'ok', text: 'Double authentification désactivée.' });
      await load();
    } else {
      setNotice({ kind: 'error', text: data.error || 'Échec.' });
    }
    setBusy(false);
  };

  const regenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { ok, data } = await postJson<{ recoveryCodes: string[] }>('/api/auth/mfa/recovery-codes', { code: regenCode });
    if (ok) {
      setRecoveryCodes(data.recoveryCodes);
      setRegenCode('');
      await load();
    } else {
      setNotice({ kind: 'error', text: data.error || 'Échec.' });
    }
    setBusy(false);
  };

  const revokeAll = async (includeCurrent: boolean) => {
    if (!confirm(includeCurrent ? 'Déconnecter tous les appareils, y compris celui-ci ?' : 'Déconnecter tous les autres appareils ?')) return;
    setRevoking(true);
    const { ok, data } = await postJson<{ loggedOut: boolean }>('/api/auth/logout-all', { includeCurrent });
    setRevoking(false);
    if (!ok) {
      setNotice({ kind: 'error', text: data.error || 'Échec.' });
      return;
    }
    if (data.loggedOut) {
      router.push('/auth/login');
      return;
    }
    setNotice({ kind: 'ok', text: 'Les autres sessions ont été déconnectées.' });
  };

  const copyCodes = async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setNotice({ kind: 'ok', text: 'Codes copiés.' });
    } catch {
      setNotice({ kind: 'error', text: 'Copie impossible — notez-les manuellement.' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" aria-label="Chargement" /></div>;
  }
  if (!security) {
    return <p className="text-sm text-gray-500">Informations de sécurité indisponibles.</p>;
  }

  const input = 'w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  const primaryBtn = 'inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60';
  const secondaryBtn = 'inline-flex items-center gap-2 border border-gray-300 bg-white text-gray-800 font-semibold py-2.5 px-5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60';

  return (
    <div className="space-y-8">
      {notice ? (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${notice.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`} role="status">
          {notice.kind === 'ok' ? <CheckCircle2 size={16} aria-hidden /> : <AlertCircle size={16} aria-hidden />}
          {notice.text}
        </div>
      ) : null}

      {/* E-mail */}
      <section className="border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2"><MailCheck size={18} className="text-blue-600" aria-hidden /> Adresse e-mail</h3>
        <p className="text-sm text-gray-600 mb-3">
          {security.email} —{' '}
          {security.emailConfirmed ? <span className="text-green-700 font-medium">confirmée</span> : <span className="text-amber-700 font-medium">non confirmée</span>}
        </p>
        {!security.emailConfirmed ? (
          <button type="button" onClick={resend} disabled={resending} className={secondaryBtn}>
            {resending ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null} Renvoyer l&apos;e-mail de confirmation
          </button>
        ) : null}
      </section>

      {/* MFA */}
      <section className="border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
          {security.mfaEnabled ? <ShieldCheck size={18} className="text-green-600" aria-hidden /> : <ShieldOff size={18} className="text-gray-400" aria-hidden />}
          Double authentification (application)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Un code à 6 chiffres généré par une application (Google Authenticator, Authy, 1Password…) est demandé à chaque connexion.
          {security.mfaEnabled ? ` Activée${security.mfaEnabledAt ? ` le ${new Date(security.mfaEnabledAt).toLocaleDateString('fr-FR')}` : ''}. Codes de récupération restants : ${security.recoveryCodesLeft}.` : ''}
        </p>

        {recoveryCodes ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Codes de récupération — notez-les maintenant, ils ne seront plus affichés.</p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-sm text-gray-800 mb-3">
              {recoveryCodes.map((c) => <li key={c} className="bg-white border rounded px-2 py-1 text-center">{c}</li>)}
            </ul>
            <div className="flex gap-2">
              <button type="button" onClick={copyCodes} className={secondaryBtn}><Copy size={16} aria-hidden /> Copier</button>
              <button type="button" onClick={() => setRecoveryCodes(null)} className={secondaryBtn}>J&apos;ai noté mes codes</button>
            </div>
          </div>
        ) : null}

        {!security.mfaEnabled && !setup ? (
          <button type="button" onClick={startSetup} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <KeyRound size={16} aria-hidden />} Activer
          </button>
        ) : null}

        {setup ? (
          <form onSubmit={confirmSetup} className="grid gap-4 sm:grid-cols-[auto_1fr] items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="QR code à scanner avec votre application d'authentification" width={220} height={220} className="rounded-lg border bg-white" />
            <div className="space-y-3">
              <p className="text-sm text-gray-700">1. Scannez le QR code avec votre application. Ou saisissez la clé : <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded break-all">{setup.secret}</code></p>
              <p className="text-sm text-gray-700">2. Saisissez le code à 6 chiffres affiché :</p>
              <input value={setupCode} onChange={(e) => setSetupCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" placeholder="123 456" className={`${input} max-w-[180px] font-mono tracking-widest`} required aria-label="Code de vérification" />
              <div className="flex gap-2">
                <button type="submit" disabled={busy || setupCode.replace(/\s/g, '').length !== 6} className={primaryBtn}>
                  {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null} Confirmer et activer
                </button>
                <button type="button" onClick={() => setSetup(null)} className={secondaryBtn}>Annuler</button>
              </div>
            </div>
          </form>
        ) : null}

        {security.mfaEnabled ? (
          <div className="space-y-4">
            {!disableForm.open ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDisableForm({ open: true, password: '', code: '' })} className={secondaryBtn}><ShieldOff size={16} aria-hidden /> Désactiver</button>
              </div>
            ) : (
              <form onSubmit={disable} className="grid gap-3 sm:grid-cols-2 max-w-xl">
                <input type="password" autoComplete="current-password" placeholder="Mot de passe actuel" value={disableForm.password} onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })} className={input} required aria-label="Mot de passe actuel" />
                <input inputMode="numeric" autoComplete="one-time-code" placeholder="Code à 6 chiffres ou code de récupération" value={disableForm.code} onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value })} className={input} required aria-label="Code" />
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-700 disabled:opacity-60">Confirmer la désactivation</button>
                  <button type="button" onClick={() => setDisableForm({ open: false, password: '', code: '' })} className={secondaryBtn}>Annuler</button>
                </div>
              </form>
            )}
            <form onSubmit={regenerate} className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="regen-code" className="block text-xs font-semibold text-gray-600 mb-1">Nouveaux codes de récupération (code de l&apos;application)</label>
                <input id="regen-code" inputMode="numeric" autoComplete="one-time-code" value={regenCode} onChange={(e) => setRegenCode(e.target.value)} placeholder="123 456" className={`${input} max-w-[180px] font-mono tracking-widest`} />
              </div>
              <button type="submit" disabled={busy || regenCode.replace(/\s/g, '').length !== 6} className={secondaryBtn}>Régénérer</button>
            </form>
          </div>
        ) : null}
      </section>

      {/* Sessions */}
      <section className="border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2"><LogOut size={18} className="text-blue-600" aria-hidden /> Appareils connectés</h3>
        <p className="text-sm text-gray-600 mb-4">Si vous pensez qu&apos;un autre appareil a accès à votre compte, déconnectez toutes les sessions. Un nouveau mot de passe déconnecte aussi tous les appareils.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => revokeAll(false)} disabled={revoking} className={secondaryBtn}>
            {revoking ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null} Déconnecter les autres appareils
          </button>
          <button type="button" onClick={() => revokeAll(true)} disabled={revoking} className="inline-flex items-center gap-2 border border-red-300 text-red-700 bg-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-50 disabled:opacity-60">
            Tout déconnecter (y compris ici)
          </button>
        </div>
      </section>
    </div>
  );
}
