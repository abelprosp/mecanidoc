"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  PlugZap,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import type { FormField, ProviderPreset, ProviderRegion } from '@/lib/supplier-connections/providers';

type Connection = {
  id: string;
  provider: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  auto_sync: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_summary: Record<string, unknown> | null;
  last_error: string | null;
  hasSecrets: boolean;
  secretHints: Record<string, boolean>;
};

type CatalogProvider = Omit<ProviderPreset, 'fields'> & { fieldCount: number };

const REGION_LABEL: Record<ProviderRegion, string> = {
  france: 'France',
  europe: 'Europe',
  generic: 'Générique',
};

function FieldInput({
  field,
  value,
  onChange,
  secretSaved,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  secretSaved?: boolean;
}) {
  const common = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select' && field.options) {
    return (
      <select className={common} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea className={common} rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
  return (
    <input
      className={common}
      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(field.type === 'number' ? e.target.value : e.target.value)}
      placeholder={secretSaved ? '•••• enregistré — laisser vide pour conserver' : field.placeholder}
      autoComplete={field.secret ? 'new-password' : 'off'}
    />
  );
}

export default function SupplierConnectionsSection() {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [providerDetails, setProviderDetails] = useState<ProviderPreset[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<'all' | ProviderRegion>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ provider: ProviderPreset; connection?: Connection } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [name, setName] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/supplier-connections', { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setProviders(data.providers || []);
      setConnections(data.connections || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/supplier-connections/providers', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProviderDetails(d.providers || []))
      .catch(() => undefined);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (region !== 'all' && p.region !== region) return false;
      if (!q) return true;
      return `${p.name} ${p.country} ${p.description}`.toLowerCase().includes(q);
    });
  }, [providers, region, query]);

  const openNew = (id: string) => {
    const preset = providerDetails.find((p) => p.id === id);
    if (!preset) return;
    const defaults: Record<string, unknown> = {};
    for (const f of preset.fields) {
      if (f.default !== undefined) defaults[f.key] = f.default;
    }
    setForm(defaults);
    setName(preset.name);
    setAutoSync(false);
    setNotice(null);
    setLogs([]);
    setEditing({ provider: preset });
  };

  const openEdit = (c: Connection) => {
    const preset = providerDetails.find((p) => p.id === c.provider);
    if (!preset) return;
    setForm({ ...c.config });
    setName(c.name);
    setAutoSync(c.auto_sync);
    setNotice(null);
    setLogs([]);
    setEditing({ provider: preset, connection: c });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/supplier-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editing.connection?.id,
          provider: editing.provider.id,
          name,
          autoSync,
          values: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec');
      setNotice({ ok: true, text: 'Connexion enregistrée. Testez puis importez le catalogue.' });
      await load();
      setEditing({ provider: editing.provider, connection: data.connection });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (id: string) => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/supplier-connections/${id}/test`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setNotice({ ok: Boolean(data.ok), text: data.message || data.error || 'Terminé' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Erreur réseau' });
    } finally {
      setTesting(false);
    }
  };

  const runSync = async (id: string) => {
    setSyncingId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/supplier-connections/${id}/sync`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l’import');
      const s = data.summary || {};
      setLogs(Array.isArray(s.logs) ? s.logs : []);
      setNotice({
        ok: true,
        text: `Import : ${s.inserted || 0} créés, ${s.updated || 0} mis à jour, ${s.skipped || 0} ignorés.`,
      });
      await load();
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setSyncingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer cette connexion ? Les pneus déjà importés restent en catalogue.')) return;
    await fetch(`/api/admin/supplier-connections/${id}`, { method: 'DELETE', credentials: 'include' });
    if (editing?.connection?.id === id) setEditing(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PlugZap className="text-[#0066CC]" /> Connexions fournisseurs
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Branchez n’importe quel grossiste pneus via API : choisissez le fournisseur, saisissez les identifiants
          reçus de votre commercial, testez, puis tirez le catalogue. Les principaux acteurs France / Europe sont
          déjà préconfigurés.
        </p>
      </header>

      {connections.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold text-gray-800">Connexions actives</div>
          <div className="divide-y">
            {connections.map((c) => (
              <div key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.provider} · {c.hasSecrets ? 'identifiants enregistrés' : 'identifiants manquants'}
                    {c.last_sync_at ? ` · dernier import ${new Date(c.last_sync_at).toLocaleString('fr-FR')}` : ''}
                    {c.last_sync_status ? ` · ${c.last_sync_status}` : ''}
                  </p>
                  {c.last_error ? <p className="text-xs text-red-600 mt-1">{c.last_error}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(c)} className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50">Configurer</button>
                  <button type="button" onClick={() => runTest(c.id)} disabled={testing} className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 inline-flex items-center gap-1">
                    <Wifi size={12} /> Tester
                  </button>
                  <button type="button" onClick={() => runSync(c.id)} disabled={syncingId === c.id} className="px-3 py-1.5 text-xs rounded-lg bg-[#0066CC] text-white hover:bg-blue-700 inline-flex items-center gap-1 disabled:opacity-50">
                    {syncingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Importer les pneus
                  </button>
                  <button type="button" onClick={() => remove(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex rounded-lg border bg-white overflow-hidden text-sm">
            {(['all', 'france', 'europe', 'generic'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={`px-3 py-1.5 ${region === r ? 'bg-[#0066CC] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {r === 'all' ? 'Tous' : REGION_LABEL[r]}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher Allopneus, Tyre24, Michelin…"
            className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const linked = connections.filter((c) => c.provider === p.id).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openNew(p.id)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-300 hover:shadow transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-0.5">
                      {p.country} · {REGION_LABEL[p.region]}
                    </p>
                  </div>
                  {linked > 0 ? (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{linked} lié{linked > 1 ? 's' : ''}</span>
                  ) : (
                    <Plus size={16} className="text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2 leading-snug">{p.description}</p>
                {p.website ? (
                  <p className="text-[11px] text-blue-600 mt-2 inline-flex items-center gap-1">
                    <Globe size={11} /> {p.website.replace(/^https?:\/\//, '')}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} aria-hidden />
          <div className="relative bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{editing.connection ? 'Configurer' : 'Nouvelle connexion'} — {editing.provider.name}</h2>
                <p className="text-xs text-gray-500 mt-1">{editing.provider.description}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Nom de la connexion</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {editing.provider.fields.map((field) => (
                <div key={field.key}>
                  {field.type !== 'checkbox' ? (
                    <label className="text-xs font-bold text-gray-600 mb-1 block">
                      {field.label}
                      {field.required ? <span className="text-red-500"> *</span> : null}
                      {field.secret ? <KeyRound size={11} className="inline ml-1 text-gray-400" /> : null}
                    </label>
                  ) : null}
                  <FieldInput
                    field={field}
                    value={form[field.key]}
                    secretSaved={Boolean(editing.connection?.secretHints?.[field.key])}
                    onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                  />
                  {field.help ? <p className="text-[11px] text-gray-400 mt-1">{field.help}</p> : null}
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
                Synchroniser automatiquement (cron horaire)
              </label>

              {notice && (
                <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${notice.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  {notice.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  {notice.text}
                </div>
              )}

              {logs.length > 0 && (
                <pre className="text-[11px] bg-gray-50 border rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap text-gray-600">
                  {logs.join('\n')}
                </pre>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  Enregistrer
                </button>
                {editing.connection && (
                  <>
                    <button type="button" onClick={() => runTest(editing.connection!.id)} disabled={testing} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">
                      {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                      Tester l’API
                    </button>
                    <button type="button" onClick={() => runSync(editing.connection!.id)} disabled={syncingId === editing.connection.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                      {syncingId === editing.connection.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Tirer les pneus
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
