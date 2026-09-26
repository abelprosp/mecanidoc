"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function TaxesSection() {
  const supabase = createClient();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingTax, setEditingTax] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchTaxes = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.from('taxes').select('*').order('sort_order', { ascending: true });
    if (error) {
      console.error('Erro ao buscar taxas:', error);
      setErrorMsg('Tabela "taxes" não encontrada neste projeto Supabase. Execute as migrations SQL.');
      setTaxes([]);
      setLoading(false);
      return;
    }
    setTaxes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleSave = async (e: React.FormEvent, taxData: any) => {
    e.preventDefault();
    const data = {
      ...taxData,
      rate: parseFloat(taxData.rate) || 0,
      is_percentage: taxData.is_percentage === 'true' || taxData.is_percentage === true,
      is_active: taxData.is_active === 'true' || taxData.is_active === true,
      sort_order: parseInt(taxData.sort_order) || 0
    };
    
    if (taxData.id) {
      const { error } = await supabase.from('taxes').update(data).eq('id', taxData.id);
      if (error) {
        alert(`Erro ao guardar taxa: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from('taxes').insert([data]);
      if (error) {
        alert(`Erro ao criar taxa: ${error.message}`);
        return;
      }
    }
    setEditingTax(null);
    setIsAdding(false);
    fetchTaxes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette taxe ?')) return;
    const { error } = await supabase.from('taxes').delete().eq('id', id);
    if (error) {
      alert(`Erro ao apagar taxa: ${error.message}`);
      return;
    }
    fetchTaxes();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion des Taxes</h1>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingTax({ name: '', description: '', rate: 0, is_percentage: true, applies_to: 'all', sort_order: (taxes.length + 1) * 10, is_active: true });
          }}
          className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto"
        >
          + Nouvelle Taxe
        </button>
      </header>
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {taxes.map((tax) => (
          <div key={tax.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-bold text-gray-800 text-sm mb-1">{tax.name}</p>
                <p className="text-gray-500 text-xs mb-1">{tax.description || 'Sans description'}</p>
                <p className="text-blue-600 font-bold text-sm">
                  {tax.is_percentage ? `${tax.rate}%` : `€${tax.rate}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTax(tax)}
                  className="text-blue-600 p-1.5"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => handleDelete(tax.id)}
                  className="text-red-600 p-1.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {taxes.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Aucune taxe configurée
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Nom</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Taux</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">S'applique à</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {taxes.map((tax) => (
              <tr key={tax.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{tax.name}</td>
                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{tax.description || '-'}</td>
                <td className="px-6 py-4 font-bold text-blue-600">{tax.is_percentage ? `${tax.rate}%` : `€${tax.rate}`}</td>
                <td className="px-6 py-4 text-gray-500">{tax.is_percentage ? 'Pourcentage' : 'Fixe'}</td>
                <td className="px-6 py-4 text-gray-500 capitalize">{tax.applies_to || 'all'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    tax.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {tax.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTax(tax)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Modifier"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(tax.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {taxes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Aucune taxe configurée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editingTax || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingTax?.id ? 'Modifier' : 'Ajouter'} une taxe</h3>
              <button
                onClick={() => {
                  setEditingTax(null);
                  setIsAdding(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                handleSave(e, { ...editingTax, ...data });
              }}
              className="p-4 md:p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom de la taxe *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingTax?.name || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingTax?.description || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Taux/Valeur *</label>
                  <input
                    name="rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingTax?.rate || 0}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
                  <select
                    name="is_percentage"
                    defaultValue={editingTax?.is_percentage ? 'true' : 'false'}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="true">Pourcentage (%)</option>
                    <option value="false">Montant fixe (€)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">S'applique à</label>
                  <select
                    name="applies_to"
                    defaultValue={editingTax?.applies_to || 'all'}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="all">Toutes les catégories</option>
                    <option value="auto">Auto</option>
                    <option value="moto">Moto</option>
                    <option value="camion">Camion</option>
                    <option value="tracteur">Tracteur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ordre</label>
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={editingTax?.sort_order || 0}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Statut</label>
                <select
                  name="is_active"
                  defaultValue={editingTax?.is_active ? 'true' : 'false'}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTax(null);
                    setIsAdding(false);
                  }}
                  className="px-4 py-2 border rounded font-medium order-2 sm:order-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-bold order-1 sm:order-2"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
