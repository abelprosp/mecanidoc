"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Loader2,
  RefreshCw,
  Truck,
  PackageSearch,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles,
  Download,
  KeyRound,
  Link2,
} from 'lucide-react';

type SetupStatus = {
  ok?: boolean;
  checks?: Record<string, boolean | string | number>;
  nextSteps?: string[];
};

type CredStatus = {
  configured?: boolean;
  source?: 'env' | 'database' | 'none';
  login?: string | null;
  hasPassword?: boolean;
  baseUrl?: string;
  testMode?: boolean;
};

export default function NeumaticosAndresSection() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingStock, setSyncingStock] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ products: 0, pendingOrders: 0 });
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [gtinEnrichConfigured, setGtinEnrichConfigured] = useState<boolean | null>(null);
  const [enrichingGtin, setEnrichingGtin] = useState(false);
  const [gtinLogs, setGtinLogs] = useState<string[]>([]);
  const [credStatus, setCredStatus] = useState<CredStatus | null>(null);
  const [credForm, setCredForm] = useState({
    login: '',
    password: '',
    baseUrl: 'https://backend-pre2.genasa.es',
    testMode: true,
  });
  const [importForm, setImportForm] = useState({
    limit: 50,
    from: 100000,
    to: 102000,
    postCode: '75001',
    category: '',
    articles: '',
  });

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
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/credentials');
      const data = await res.json();
      if (res.ok) {
        setCredStatus(data);
        setCredForm((prev) => ({
          ...prev,
          baseUrl: data.baseUrl || prev.baseUrl,
          testMode: typeof data.testMode === 'boolean' ? data.testMode : prev.testMode,
        }));
      }
    } catch {
      /* ignore */
    }
  };

  const checkSetup = async () => {
    setCheckingSetup(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/status');
      const data = await res.json();
      setSetupStatus(data);
    } catch {
      setSetupStatus({ ok: false, nextSteps: ['Erro de rede ao verificar.'] });
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

  const saveCredentials = async () => {
    setSavingCreds(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: credForm.login || undefined,
          password: credForm.password || undefined,
          baseUrl: credForm.baseUrl,
          testMode: credForm.testMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao guardar');
      setCredStatus(data);
      setCredForm((prev) => ({ ...prev, password: '' }));
      alert('Credenciais da API guardadas.');
      await checkSetup();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao guardar credenciais');
    } finally {
      setSavingCreds(false);
    }
  };

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
        setConnectionResult(data.error || 'Ligação falhou');
      } else {
        setConnectionResult(
          `OK — ${data.sample?.productId || 'API'} | stock: ${data.sample?.amount ?? '?'} | preço: €${data.sample?.price ?? '?'}`
        );
      }
    } catch {
      setConnectionResult('Erro de rede');
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
      alert('Configuração Neumáticos Andrés guardada.');
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar.');
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
      if (!res.ok) throw new Error(data.error || 'Erro sync stock');
      setLogs(data.logs || []);
      alert(`Stock sincronizado: ${data.updated} atualizados, ${data.skipped} ignorados.`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro sync stock');
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
      if (!res.ok) throw new Error(data.error || 'Erro sync tracking');
      setLogs(data.logs || []);
      alert(`Tracking sincronizado: ${data.shipmentsUpserted} envio(s), ${data.ordersUpdated} estado(s).`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro sync tracking');
    } finally {
      setSyncingTracking(false);
    }
  };

  const runCatalogImport = async () => {
    setImportingCatalog(true);
    setLogs([]);
    try {
      const res = await fetch('/api/integrations/neumaticos-andres/import-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: Number(importForm.limit) || 50,
          from: Number(importForm.from) || undefined,
          to: Number(importForm.to) || undefined,
          postCode: importForm.postCode || '75001',
          category: importForm.category || null,
          articles: importForm.articles || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao importar catálogo');
      setLogs(data.logs || []);
      setStats((prev) => ({
        ...prev,
        products: prev.products + (data.inserted || 0),
      }));
      alert(
        `Pneus importados: ${data.inserted || 0} novos, ${data.updated || 0} atualizados (${data.skipped || 0} ignorados).`
      );
      await checkSetup();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao puxar pneus');
    } finally {
      setImportingCatalog(false);
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
      if (!res.ok) throw new Error(data.error || 'Erro enriquecimento GTIN');
      setGtinLogs(data.logs || []);
      alert(
        `GTIN: ${data.updated ?? 0} enriquecido(s), ${data.skipped ?? 0} ignorado(s), ${data.errors ?? 0} erro(s).`
      );
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro enriquecimento GTIN');
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
      {/* Ligar API */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Link2 size={18} /> Ligar API do fornecedor (Europa)
            </h2>
            <p className="text-sm text-gray-500">
              Introduza as credenciais Neumáticos Andrés para o MecaniDoc puxar pneus, stock e preços.
              O .env tem prioridade se estiver definido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkSetup}
              disabled={checkingSetup}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
            >
              {checkingSetup ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Verificar setup
            </button>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-50 disabled:opacity-60 flex items-center gap-2"
            >
              {testingConnection ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />}
              Testar ligação
            </button>
          </div>
        </div>

        {credStatus && (
          <p className="text-sm mb-4 text-gray-600">
            Estado:{' '}
            <span className={credStatus.configured ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {credStatus.configured ? 'configurado' : 'não configurado'}
            </span>
            {credStatus.source && credStatus.source !== 'none' && (
              <> (fonte: {credStatus.source === 'env' ? '.env' : 'painel'})</>
            )}
            {credStatus.login && <> · login {credStatus.login}</>}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Login API</label>
            <input
              type="text"
              value={credForm.login}
              onChange={(e) => setCredForm({ ...credForm, login: e.target.value })}
              placeholder={credStatus?.login ? `Atual: ${credStatus.login}` : 'login do fornecedor'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Password API</label>
            <input
              type="password"
              value={credForm.password}
              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
              placeholder={credStatus?.hasPassword ? '•••••••• (deixe vazio para manter)' : 'password'}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">URL base</label>
            <select
              value={credForm.baseUrl}
              onChange={(e) => setCredForm({ ...credForm, baseUrl: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            >
              <option value="https://backend-pre2.genasa.es">Teste — backend-pre2.genasa.es</option>
              <option value="https://backend.genasa.es">Produção — backend.genasa.es</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={credForm.testMode}
                onChange={(e) => setCredForm({ ...credForm, testMode: e.target.checked })}
              />
              Modo teste
            </label>
          </div>
        </div>

        <button
          onClick={saveCredentials}
          disabled={savingCreds}
          className="mt-4 bg-[#0066CC] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
        >
          {savingCreds ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
          Guardar ligação API
        </button>

        {setupStatus && (
          <div className="mt-6 space-y-3">
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <StatusRow ok={Boolean(setupStatus.checks?.credentials)} label="Credenciais configuradas" />
              <StatusRow ok={Boolean(setupStatus.checks?.databaseMigration)} label="Migração SQL OK" />
              <StatusRow
                ok={Number(setupStatus.checks?.linkedProductCount) > 0}
                label={`Pneus ligados (${setupStatus.checks?.linkedProductCount ?? 0})`}
              />
              <StatusRow
                ok={Number(setupStatus.checks?.productsWithEan) > 0}
                label={`Produtos com EAN (${setupStatus.checks?.productsWithEan ?? 0})`}
              />
            </div>
            {setupStatus.nextSteps && setupStatus.nextSteps.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <p className="font-bold mb-2 flex items-center gap-2">
                  <AlertCircle size={16} /> Próximos passos
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  {setupStatus.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
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

      {/* Puxar pneus */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Download size={18} /> Puxar pneus da API europeia
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Importa catálogo (preço + stock) da Neumáticos Andrés para o MecaniDoc. Pode indicar EANs/refs
          específicas ou varrer um intervalo numérico.
        </p>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Limite de produtos</label>
            <input
              type="number"
              min={1}
              max={200}
              value={importForm.limit}
              onChange={(e) => setImportForm({ ...importForm, limit: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Código postal (stock)</label>
            <input
              type="text"
              value={importForm.postCode}
              onChange={(e) => setImportForm({ ...importForm, postCode: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Categoria (opcional)</label>
            <select
              value={importForm.category}
              onChange={(e) => setImportForm({ ...importForm, category: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">Todas</option>
              <option value="Auto">Auto</option>
              <option value="Moto">Moto</option>
              <option value="Camion">Camion</option>
              <option value="Tracteur">Tracteur</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Varredura — de</label>
            <input
              type="number"
              value={importForm.from}
              onChange={(e) => setImportForm({ ...importForm, from: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Varredura — até</label>
            <input
              type="number"
              value={importForm.to}
              onChange={(e) => setImportForm({ ...importForm, to: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-600 mb-1">
              EANs / refs específicas (opcional, separados por vírgula)
            </label>
            <textarea
              value={importForm.articles}
              onChange={(e) => setImportForm({ ...importForm, articles: e.target.value })}
              rows={2}
              placeholder="3286341675412, 4019238..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={runCatalogImport}
          disabled={importingCatalog}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
        >
          {importingCatalog ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          Puxar pneus agora
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Neumáticos Andrés</h1>
        <p className="text-sm text-gray-500 mb-6">
          Integração API v1.8 — stock, encomendas diretas e tracking de entrega.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase text-gray-500">Pneus ligados</p>
            <p className="text-2xl font-bold text-gray-800">{stats.products}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase text-gray-500">Encomendas em curso</p>
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
            <span className="text-sm font-medium text-gray-700">Ativar integração</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.na_auto_fulfill !== false}
              onChange={(e) => setSettings({ ...settings, na_auto_fulfill: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700">
              Enviar automaticamente a encomenda ao fornecedor após pagamento
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(settings.na_auto_sync_stock)}
              onChange={(e) => setSettings({ ...settings, na_auto_sync_stock: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700">
              Sincronizar stock via cron (<code className="text-xs">/api/cron/neumaticos-andres</code>)
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
                Usar consignee registado no fornecedor
              </span>
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Identificador consignee</label>
                <input
                  type="text"
                  value={settings.na_consignee_identifier || ''}
                  onChange={(e) => setSettings({ ...settings, na_consignee_identifier: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tipo consignee</label>
                <select
                  value={settings.na_consignee_type || 1}
                  onChange={(e) => setSettings({ ...settings, na_consignee_type: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value={1}>1 — Atribuído pelo vendedor</option>
                  <option value={2}>2 — Atribuído pelo comprador</option>
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
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
          <button
            onClick={runStockSync}
            disabled={syncingStock}
            className="border border-gray-300 px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
          >
            {syncingStock ? <Loader2 className="animate-spin" size={16} /> : <PackageSearch size={16} />}
            Sync stock & preço
          </button>
          <button
            onClick={runTrackingSync}
            disabled={syncingTracking}
            className="border border-gray-300 px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
          >
            {syncingTracking ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
            Sync entrega
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Sparkles size={18} /> Enriquecimento catálogo (GTIN)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Completa nome, marca, descrição e imagem via GTINHub e UPCitemdb.
        </p>

        {gtinEnrichConfigured === true && (
          <p className="text-sm text-green-700 flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} /> APIs GTIN prontas
          </p>
        )}

        <button
          onClick={runGtinEnrich}
          disabled={enrichingGtin || gtinEnrichConfigured === false}
          className="border border-indigo-300 text-indigo-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2"
        >
          {enrichingGtin ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          Enriquecer via GTIN (max 25)
        </button>

        {gtinLogs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono max-h-48 overflow-auto mt-4">
            {gtinLogs.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
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
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{label}</span>
    </div>
  );
}
