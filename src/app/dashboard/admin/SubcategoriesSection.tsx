"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Settings, Trash2, Loader2 } from 'lucide-react';

export default function SubcategoriesSection() {
  const supabase = createClient();
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [filterParent, setFilterParent] = useState<string>('');

  const fetchSubcategories = async () => {
    setLoading(true);
    let query = supabase.from('menu_subcategories').select('*').order('parent_category').order('sort_order');
    if (filterParent) {
      query = query.eq('parent_category', filterParent);
    }
    const { data } = await query;
    setSubcategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubcategories();
  }, [filterParent]);

  const handleSave = async (e: React.FormEvent, subData: any) => {
    e.preventDefault();
    const data = {
      ...subData,
      sort_order: parseInt(subData.sort_order) || 0,
      is_active: subData.is_active === 'true' || subData.is_active === true,
      product_category_filter: subData.product_category_filter || subData.parent_category
    };
    
    if (subData.id) {
      await supabase.from('menu_subcategories').update(data).eq('id', subData.id);
    } else {
      await supabase.from('menu_subcategories').insert([data]);
    }
    setEditingSub(null);
    setIsAdding(false);
    fetchSubcategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette sous-catégorie ?')) return;
    await supabase.from('menu_subcategories').delete().eq('id', id);
    fetchSubcategories();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion des Sous-catégories du Menu</h1>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingSub({ name: '', slug: '', parent_category: 'Auto', product_category_filter: 'Auto', icon_name: '', sort_order: 0, is_active: true });
          }}
          className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto"
        >
          + Nouvelle Sous-catégorie
        </button>
      </header>

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 mb-1">Filtrer par catégorie parente:</label>
        <select
          value={filterParent}
          onChange={(e) => setFilterParent(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">Toutes</option>
          <option value="Auto">Auto</option>
          <option value="Moto">Moto</option>
          <option value="Camion">Camion</option>
          <option value="Tracteur">Tracteur</option>
        </select>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {subcategories.map((sub) => (
          <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-bold text-gray-800 text-sm mb-1">{sub.name}</p>
                <p className="text-gray-500 text-xs mb-1">Parent: {sub.parent_category} | Produit: {sub.product_category_filter || sub.parent_category}</p>
                <p className="text-blue-600 text-xs font-mono">{sub.slug}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSub(sub)}
                  className="text-blue-600 p-1.5"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="text-red-600 p-1.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {subcategories.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Aucune sous-catégorie trouvée
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Nom</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Catégorie Parente</th>
              <th className="px-6 py-4">Catégorie Produit</th>
              <th className="px-6 py-4">Ordre</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subcategories.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{sub.name}</td>
                <td className="px-6 py-4 font-mono text-blue-600 text-xs">{sub.slug}</td>
                <td className="px-6 py-4 text-gray-600">{sub.parent_category}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                    {sub.product_category_filter || sub.parent_category}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{sub.sort_order}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    sub.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sub.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSub(sub)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Modifier"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {subcategories.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Aucune sous-catégorie trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editingSub || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingSub?.id ? 'Modifier' : 'Ajouter'} une sous-catégorie</h3>
              <button
                onClick={() => {
                  setEditingSub(null);
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
                handleSave(e, { ...editingSub, ...data });
              }}
              className="p-4 md:p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingSub?.name || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Slug *</label>
                <input
                  name="slug"
                  type="text"
                  defaultValue={editingSub?.slug || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                  required
                  placeholder="pneus-4-saisons"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie Parente *</label>
                  <select
                    name="parent_category"
                    defaultValue={editingSub?.parent_category || 'Auto'}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  >
                    <option value="Auto">Auto</option>
                    <option value="Moto">Moto</option>
                    <option value="Camion">Camion</option>
                    <option value="Tracteur">Tracteur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie Produit *</label>
                  <select
                    name="product_category_filter"
                    defaultValue={editingSub?.product_category_filter || editingSub?.parent_category || 'Auto'}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  >
                    <option value="Auto">Auto</option>
                    <option value="Moto">Moto</option>
                    <option value="Camion">Camion</option>
                    <option value="Tracteurs">Tracteurs</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Tipo de produto a mostrar nesta página</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ícone (opcional)</label>
                  <input
                    name="icon_name"
                    type="text"
                    defaultValue={editingSub?.icon_name || ''}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Car, Bike, Truck, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ordre</label>
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={editingSub?.sort_order || 0}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Statut</label>
                <select
                  name="is_active"
                  defaultValue={editingSub?.is_active ? 'true' : 'false'}
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
                    setEditingSub(null);
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
