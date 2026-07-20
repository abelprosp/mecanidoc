"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Copy, Trash2, Plus, CheckCircle2 } from 'lucide-react';

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

export default function SupplierApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState('Produção');
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/supplier/api-keys');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar chaves');
      setKeys(data.keys || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    setCreating(true);
    setError(null);
    setFreshKey(null);
    try {
      const res = await fetch('/api/supplier/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Chave API' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar chave');
      setFreshKey(data.key?.api_key || null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revogar esta chave? Deixa de funcionar de imediato.')) return;
    try {
      const res = await fetch('/api/supplier/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao revogar');
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro');
    }
  };

  const copyKey = async () => {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
          <KeyRound size={20} /> API MecaniDoc
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Gere uma chave para o seu sistema enviar e consultar produtos no MecaniDoc.
          Autenticação: <code className="text-xs bg-gray-100 px-1 rounded">Authorization: Bearer mdk_…</code> ou{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">X-API-Key</code>.
        </p>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 mb-6 space-y-1">
          <p className="font-semibold">Endpoints</p>
          <p>
            <code>GET/POST /api/v1/products</code> — listar / criar ou atualizar
          </p>
          <p>
            <code>GET/PATCH/DELETE /api/v1/products/:id</code> — detalhe / editar / desativar
          </p>
          <p>
            <code>GET /api/v1/me</code> — conta e resumo
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nome da chave</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={createKey}
            disabled={creating}
            className="bg-[#0066CC] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Criar chave
          </button>
        </div>

        {freshKey && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
            <p className="text-sm font-bold text-amber-900 mb-2">
              Guarde esta chave agora — não será mostrada outra vez.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <code className="text-xs bg-white border px-2 py-1 rounded break-all flex-1">{freshKey}</code>
              <button
                onClick={copyKey}
                className="border border-amber-300 text-amber-900 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 hover:bg-amber-100"
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não tem chaves API.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Prefixo</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Último uso</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-800">{k.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{k.prefix}…</td>
                    <td className="py-3 pr-4">
                      {k.is_active ? (
                        <span className="text-green-700">Ativa</span>
                      ) : (
                        <span className="text-red-600">Revogada</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {k.is_active && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded"
                          title="Revogar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-2">Exemplo — enviar produto</h3>
        <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto">{`curl -X POST https://seu-dominio.com/api/v1/products \\
  -H "Authorization: Bearer mdk_SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Pneu 205/55 R16",
    "base_price": 89.90,
    "stock_quantity": 20,
    "ean": "3286341675412",
    "sku": "REF-123",
    "category": "Auto",
    "brand": "Michelin"
  }'`}</pre>
      </div>
    </div>
  );
}
