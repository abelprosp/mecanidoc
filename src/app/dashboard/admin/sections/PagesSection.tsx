"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function PagesSection() {
  const supabase = createClient();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await supabase.from('category_pages').select('*').order('slug');
    setPages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('category_pages').upsert(editingPage).select();
    if (error) { alert('Erreur: ' + error.message); } else { setEditingPage(null); fetchPages(); }
    setSaving(false);
  };

  const handleCreateClick = () => {
    setEditingPage({
      slug: '', hero_image: '', seo_title: '', seo_text: '',
      promo_banners: [{ title: 'Promo 1', subtitle: '', image: '', badge_text: 'PROMO', badge_color: 'red' }, { title: 'Promo 2', subtitle: '', image: '', badge_text: 'OFFRE', badge_color: 'blue' }, { title: 'Promo 3', subtitle: '', image: '', badge_text: 'NEW', badge_color: 'green' }],
      marketing_banner: { title: 'Nouveauté', text: '', image: '', link: '#' }
    });
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion des Pages Catégories</h1>
        <button onClick={handleCreateClick} className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto">
          + Nouvelle
        </button>
      </header>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {pages.map((page) => (
          <div key={page.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-mono text-blue-600 text-sm">{page.slug}</p>
                <p className="text-gray-800 font-medium mt-1">{page.seo_title}</p>
                <p className="text-gray-500 text-xs mt-1">Produit: {page.product_category_filter || 'Auto'}</p>
              </div>
              <button onClick={() => setEditingPage(page)} className="text-blue-600 font-bold border px-3 py-1 rounded text-sm shrink-0">
                Modifier
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Titre</th>
              <th className="px-6 py-4">Catégorie Produit</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-6 py-4 font-mono text-blue-600">{page.slug}</td>
                <td className="px-6 py-4">{page.seo_title}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                    {page.product_category_filter || 'Auto'}
                  </span>
                </td>
                <td className="px-6 py-4"><button onClick={() => setEditingPage(page)} className="text-blue-600 font-bold border px-3 py-1 rounded">Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold">Éditer la page</h3>
              <button onClick={() => setEditingPage(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSavePage} className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Slug</label>
                  <input type="text" placeholder="pneus-4-saisons" value={editingPage.slug} onChange={e => setEditingPage({...editingPage, slug: e.target.value})} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Titre SEO</label>
                  <input type="text" placeholder="Titre SEO" value={editingPage.seo_title} onChange={e => setEditingPage({...editingPage, seo_title: e.target.value})} className="w-full border rounded p-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Image Hero URL</label>
                <input type="text" placeholder="https://..." value={editingPage.hero_image} onChange={e => setEditingPage({...editingPage, hero_image: e.target.value})} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Texte SEO</label>
                <textarea placeholder="Texte SEO" value={editingPage.seo_text} onChange={e => setEditingPage({...editingPage, seo_text: e.target.value})} className="w-full border rounded p-2 h-24" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie Produit *</label>
                <select
                  value={editingPage.product_category_filter || 'Auto'}
                  onChange={e => setEditingPage({...editingPage, product_category_filter: e.target.value})}
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
              
              <h4 className="font-bold text-sm md:text-base">Bannières Promo</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="border p-3 rounded bg-gray-50 space-y-2">
                    <p className="text-xs font-bold text-gray-400">Promo {idx + 1}</p>
                    <input type="text" placeholder="Titre" value={editingPage.promo_banners?.[idx]?.title || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].title=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-2 text-sm" />
                    <input type="text" placeholder="Sous-titre" value={editingPage.promo_banners?.[idx]?.subtitle || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].subtitle=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-2 text-sm" />
                    <input type="text" placeholder="Image URL" value={editingPage.promo_banners?.[idx]?.image || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].image=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-2 text-sm" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button type="button" onClick={() => setEditingPage(null)} className="px-4 py-2 border rounded font-medium order-2 sm:order-1">Annuler</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold order-1 sm:order-2">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
