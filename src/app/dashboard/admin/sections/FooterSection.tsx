"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function FooterSection() {
  const supabase = createClient();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase.from('footer_links').select('*').order('sort_order');
    setLinks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const handleSave = async (e: React.FormEvent, linkData: any) => {
    e.preventDefault();
    if (linkData.id) {
       await supabase.from('footer_links').update(linkData).eq('id', linkData.id);
    } else {
       await supabase.from('footer_links').insert([linkData]);
    }
    setEditingLink(null);
    setIsAdding(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Supprimer ?')) return;
    await supabase.from('footer_links').delete().eq('id', id);
    fetchLinks();
  };

  const sections = {
    products: 'Produits et Services',
    terms: 'Termes et Conditions',
    institutional: 'Institutionnel',
    legal: 'Légal (Barre inférieure)'
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
       <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion du Pied de page</h1>
        <button onClick={() => { setIsAdding(true); setEditingLink({ section: 'products', sort_order: 0, is_active: true }); }} className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto">
          + Nouveau Lien
        </button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
        {Object.entries(sections).map(([key, label]) => (
           <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="font-bold text-blue-600 mb-3 md:mb-4 uppercase text-xs tracking-wider">{label}</h3>
              <ul className="space-y-2">
                 {links.filter(l => l.section === key).sort((a,b) => a.sort_order - b.sort_order).map(link => (
                    <li key={link.id} className="flex justify-between items-center bg-gray-50 p-2 rounded group">
                       <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-sm text-gray-800 truncate">{link.title}</p>
                          <p className="text-xs text-gray-400 truncate">{link.url || `/page/${link.slug}`}</p>
                       </div>
                       <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setEditingLink(link)} className="text-blue-600 p-1.5"><Settings size={14} /></button>
                          <button onClick={() => handleDelete(link.id)} className="text-red-600 p-1.5"><Trash2 size={14} /></button>
                       </div>
                    </li>
                 ))}
                 {links.filter(l => l.section === key).length === 0 && (
                   <li className="text-gray-400 text-sm text-center py-4">Aucun lien</li>
                 )}
              </ul>
           </div>
        ))}
      </div>

      {(editingLink || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingLink?.id ? 'Modifier' : 'Ajouter'} un lien</h3>
              <button onClick={() => { setEditingLink(null); setIsAdding(false); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
             <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.target as HTMLFormElement);
                 const data = Object.fromEntries(formData.entries());
                 handleSave(e, { ...editingLink, ...data, is_active: true });
             }} className="p-4 md:p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Titre</label>
                   <input name="title" defaultValue={editingLink?.title} className="w-full border rounded p-2" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">URL (ex: /auth/login)</label>
                      <input name="url" defaultValue={editingLink?.url} className="w-full border rounded p-2" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Slug (ex: qui-sommes-nous)</label>
                      <input name="slug" defaultValue={editingLink?.slug} className="w-full border rounded p-2" />
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Section</label>
                      <select name="section" defaultValue={editingLink?.section} className="w-full border rounded p-2">
                         <option value="products">Produits et Services</option>
                         <option value="terms">Termes et Conditions</option>
                         <option value="institutional">Institutionnel</option>
                         <option value="legal">Légal (Barre inférieure)</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Ordre</label>
                      <input name="sort_order" type="number" defaultValue={editingLink?.sort_order || 0} className="w-full border rounded p-2" />
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Contenu (HTML)</label>
                    <textarea 
                      name="content" 
                      defaultValue={editingLink?.content || ''} 
                      className="w-full border rounded p-2 h-64 font-mono text-xs" 
                      placeholder="<h1>Titre</h1>&#10;<p>Contenu de la page en HTML...</p>"
                    ></textarea>
                    <p className="text-xs text-gray-400 mt-1">Vous pouvez utiliser du HTML pour formater le contenu (h1, h2, p, ul, li, strong, etc.)</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                   <button type="button" onClick={() => { setEditingLink(null); setIsAdding(false); }} className="px-4 py-2 border rounded font-medium order-2 sm:order-1">Annuler</button>
                   <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold order-1 sm:order-2">Sauvegarder</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
