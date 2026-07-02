"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2, RefreshCw, Truck, PackageSearch, CheckCircle2, AlertCircle, Wifi, Sparkles } from 'lucide-react';

type SetupStatus = {
  ok?: boolean;
  checks?: Record<string, boolean | string | number>;
  nextSteps?: string[];
};

export default function NeumaticosAndresSection() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingStock, setSyncingStock] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ products: 0, pendingOrders: 0 });
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [gtinEnrichConfigured, setGtinEnrichConfigured] = useState<boolean | null>(null);
  const [enrichingGtin, setEnrichingGtin] = useState(false);
  const [gtinLogs, setGtinLogs] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('global_settings').select('*').maybeSingle();
      setSettings(data || {});

      const { count: productsCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('external_supplier', 'neumaticos_andres');

      const { count: pendingCount } = await supabase
        .from('supplier_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['submitted', 'confirmed', 'processing']);

      setStats({
        products: productsCount || 0,
        pendingOrders: pendingCount || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const checkSetup = async () => {
    setCheckingSetup(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/status');
      const data = await res.json();
      setSetupStatus(data);
    } catch {
      setSetupStatus({ ok: false, nextSteps: ['Erreur réseau lors de la vérification.'] });
    } finally {
      setCheckingSetup(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  useEffect(() => {
    const loadGtinEnrich = async () => {
      try {
        const res = await fetch('/api/enrich/gtin');
        if (!res.ok) {
          setGtinEnrichConfigured(false);
          return;
        }
        const data = await res.json();
        setGtinEnrichConfigured(Boolean(data.configured));
      } catch {
        setGtinEnrichConfigured(false);
      }
    };
    loadGtinEnrich();
  }, []);

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setConnectionResult(data.error || 'Connexion échouée');
      } else {
        setConnectionResult(
          `OK — ${data.sample?.productId || 'API'} | stock: ${data.sample?.amount ?? '?'} | prix: €${data.sample?.price ?? '?'}`
        );
      }
    } catch {
      setConnectionResult('Erreur réseau');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        na_integration_enabled: Boolean(settings.na_integration_enabled),
        na_auto_fulfill: Boolean(settings.na_auto_fulfill),
        na_auto_sync_stock: Boolean(settings.na_auto_sync_stock),
        na_use_consignee: Boolean(settings.na_use_consignee),
        na_consignee_identifier: settings.na_consignee_identifier || null,
        na_consignee_type: settings.na_consignee_type ? Number(settings.na_consignee_type) : 1,
      };

      if (settings.id) {
        await supabase.from('global_settings').update(payload).eq('id', settings.id);
      } else {
        const { data } = await supabase.from('global_settings').insert([payload]).select().single();
        if (data) setSettings(data);
      }
      setSettings((prev: any) => ({ ...prev, ...payload }));
      alert('Configuration Neumáticos Andrés enregistrée.');
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const runStockSync = async () => {
    setSyncingStock(true);
    setLogs([]);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/sync-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sync stock');
      setLogs(data.logs || []);
      alert(`Stock synchronisé: ${data.updated} mis à jour, ${data.skipped} ignorés.`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erreur sync stock');
    } finally {
      setSyncingStock(false);
    }
  };

  const runTrackingSync = async () => {
    setSyncingTracking(true);
    setLogs([]);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/sync-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sync tracking');
      setLogs(data.logs || []);
      alert(`Tracking synchronisé: ${data.shipmentsUpserted} envoi(s), ${data.ordersUpdated} statut(s).`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erreur sync tracking');
    } finally {
      setSyncingTracking(false);
    }
  };

  const runGtinEnrich = async () => {
    setEnrichingGtin(true);
    setGtinLogs([]);
    try {
      const res = await fetch('/api/enrich/gtin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          all: true,
          limit: 25,
          externalSupplier: 'neumaticos_andres',
          onlyMissingName: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur enrichissement GTIN');
      setGtinLogs(data.logs || []);
      alert(
        `GTIN: ${data.updated ?? 0} enrichi(s), ${data.skipped ?? 0} ignoré(s), ${data.errors ?? 0} erreur(s).`
      );
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erreur enrichissement GTIN');
    } finally {
      setEnrichingGtin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">État de l&apos;installation</h2>
            <p className="text-sm text-gray-500">Vérifiez que tout est prêt avant d&apos;activer.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkSetup}
              disabled={checkingSetup}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
            >
              {checkingSetup ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Vérifier setup
            </button>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-50 disabled:opacity-60 flex items-center gap-2"
            >
              {testingConnection ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />}
              Tester connexion API
            </button>
          </div>
        </div>

        {setupStatus && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <StatusRow
                ok={Boolean(setupStatus.checks?.credentials)}
                label="Credenciais no .env"
              />
              <StatusRow
                ok={Boolean(setupStatus.checks?.databaseMigration)}
                label="Migração SQL executada"
              />
              <StatusRow
                ok={Number(setupStatus.checks?.linkedProductCount) > 0}
                label={`Produtos ligados (${setupStatus.checks?.linkedProductCount ?? 0})`}
              />
              <StatusRow
                ok={Number(setupStatus.checks?.productsWithEan) > 0}
                label={`Produtos com EAN (${setupStatus.checks?.productsWithEan ?? 0})`}
              />
            </div>

            {setupStatus.nextSteps && setupStatus.nextSteps.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <p className="font-bold mb-2 flex items-center gap-2">
                  <AlertCircle size={16} /> Prochaines étapes
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  {setupStatus.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {setupStatus.ok && (
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 size={16} /> Prêt — activez l&apos;intégration et lancez le sync stock.
              </p>
            )}
          </div>
        )}

        {connectionResult && (
          <p
            className={`mt-4 text-sm rounded-lg px-3 py-2 ${
              connectionResult.startsWith('OK')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {connectionResult}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Neumáticos Andrés</h1>
        <p className="text-sm text-gray-500 mb-6">
          Intégration API v1.8 — stock, commandes directes et suivi de livraison.
          Les identifiants API se configurent via les variables d&apos;environnement serveur.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase text-gray-500">Produits liés</p>
            <p className="text-2xl font-bold text-gray-800">{stats.products}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase text-gray-500">Commandes en cours</p>
            <p className="text-2xl font-bold text-gray-800">{stats.pendingOrders}</p>
          </div>
        </div>

        <div className="space-y-4 max-w-2xl">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(settings.na_integration_enabled)}
              onChange={(e) => setSettings({ ...settings, na_integration_enabled: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700">Activer l&apos;intégration</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.na_auto_fulfill !== false}
              onChange={(e) => setSettings({ ...settings, na_auto_fulfill: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700">
              Envoyer automatiquement la commande au fournisseur après paiement
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(settings.na_auto_sync_stock)}
              onChange={(e) => setSettings({ ...settings, na_auto_sync_stock: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700">
              Synchroniser le stock via cron (<code className="text-xs">/api/cron/neumaticos-andres</code>)
            </span>
          </label>

          <div className="border-t pt-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={Boolean(settings.na_use_consignee)}
                onChange={(e) => setSettings({ ...settings, na_use_consignee: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700">
                Utiliser un consignee enregistré chez le fournisseur (sans adresse manuelle)
              </span>
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Identifiant consignee</label>
                <input
                  type="text"
                  value={settings.na_consignee_identifier || ''}
                  onChange={(e) => setSettings({ ...settings, na_consignee_identifier: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Type consignee</label>
                <select
                  value={settings.na_consignee_type || 1}
                  onChange={(e) => setSettings({ ...settings, na_consignee_type: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value={1}>1 — Assigné par le vendeur</option>
                  <option value={2}>2 — Assigné par l&apos;acheteur</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            onClick={runStockSync}
            disabled={syncingStock}
            className="border border-gray-300 px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
          >
            {syncingStock ? <Loader2 className="animate-spin" size={16} /> : <PackageSearch size={16} />}
            Sync stock & prix
          </button>
          <button
            onClick={runTrackingSync}
            disabled={syncingTracking}
            className="border border-gray-300 px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
          >
            {syncingTracking ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
            Sync livraison
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Sparkles size={18} /> Enrichissement catalogue (GTIN)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Complète nom, marque, description et image via GTINHub et UPCitemdb (gratuit, sans clé obligatoire).
          Le stock et le prix restent synchronisés via Neumáticos Andrés.
        </p>

        {gtinEnrichConfigured === true && (
          <p className="text-sm text-green-700 flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} /> APIs GTIN prêtes — limite grátis ~10/dia (GTINHub) + 100/dia (UPCitemdb).
          </p>
        )}

        <button
          onClick={runGtinEnrich}
          disabled={enrichingGtin || gtinEnrichConfigured === false}
          className="border border-indigo-300 text-indigo-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2"
        >
          {enrichingGtin ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          Enrichir via GTIN (max 25)
        </button>

        {gtinLogs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono max-h-48 overflow-auto mt-4">
            {gtinLogs.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <RefreshCw size={18} /> Configuration serveur
        </h2>
        <ul className="text-sm text-gray-600 space-y-1 font-mono">
          <li>NEUMATICOS_ANDRES_LOGIN</li>
          <li>NEUMATICOS_ANDRES_PASSWORD</li>
          <li>NEUMATICOS_ANDRES_BASE_URL (prod: https://backend.genasa.es)</li>
          <li>NEUMATICOS_ANDRES_TEST_MODE (0 ou 1)</li>
          <li>CRON_SECRET (pour /api/cron/neumaticos-andres)</li>
          <li>GTINHUB_API_KEY (opcional — mais pedidos/dia)</li>
          <li>UPCITEMDB_USER_KEY (opcional — plano pago UPCitemdb)</li>
        </ul>
        <p className="text-sm text-gray-500 mt-4">
          Marquez les produits avec <code>external_supplier = neumaticos_andres</code> et un EAN valide.
          Vous pouvez aussi ajouter la colonne CSV <code>external_supplier</code> lors de l&apos;import.
        </p>
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono max-h-64 overflow-auto">
          {logs.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{label}</span>
    </div>
  );
}
