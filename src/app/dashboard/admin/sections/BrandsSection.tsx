"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Grid, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { normalizeAdminImageUrl } from './shared';

export default function BrandsSection() {
  const supabase = createClient();
  const [brands, setBrands] = useState<any[]>([]);
  const [missingBrands, setMissingBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);
  const newLogoFileRef = useRef<HTMLInputElement>(null);
  const editLogoFileRef = useRef<HTMLInputElement>(null);

  const uploadBrandLogo = async (file: File, brandFolderId: string) => {
    setLogoUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('brandId', brandFolderId);
      const res = await fetch('/api/admin/brand-logo', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Échec du téléversement');
      if (!data.url) throw new Error('Réponse invalide du serveur');
      return data.url as string;
    } finally {
      setLogoUploadBusy(false);
    }
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from('brands').select('*').order('name');
    setBrands(data || []);
    setLoading(false);
  };

  const findMissingBrands = async () => {
    // Buscar todas as marcas dos produtos
    const { data: products } = await supabase.from('products').select('brand');
    const { data: existingBrands } = await supabase.from('brands').select('name');
    
    if (products && existingBrands) {
      // Criar um set de marcas existentes (normalizado para lowercase)
      const existingNames = new Set(existingBrands.map((b: any) => b.name?.toLowerCase().trim()));
      
      // Encontrar marcas únicas dos produtos que não existem
      const productBrands = new Set<string>();
      products.forEach((p: any) => {
        if (p.brand && p.brand.trim()) {
          const brandName = p.brand.trim();
          if (!existingNames.has(brandName.toLowerCase())) {
            productBrands.add(brandName);
          }
        }
      });
      
      setMissingBrands(Array.from(productBrands).sort());
    }
  };

  useEffect(() => { 
    fetchBrands();
    findMissingBrands();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    let logo = newLogo.trim();
    if (logo) {
      try {
        logo = await normalizeAdminImageUrl(logo, { kind: 'brand', brandId: 'pending' });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Échec de l'import d'image");
        return;
      }
    }
    const { error } = await supabase.from('brands').insert([{ name: newName, logo_url: logo }]);
    if (error) {
      alert('Erreur lors de l\'ajout de la marque');
    } else {
      setNewName('');
      setNewLogo('');
      fetchBrands();
      findMissingBrands();
    }
  };

  const handleAddMissingBrand = async (brandName: string) => {
    const { error } = await supabase.from('brands').insert([{ name: brandName, logo_url: '' }]);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      fetchBrands();
      setMissingBrands(missingBrands.filter(b => b !== brandName));
    }
  };

  const handleAddAllMissingBrands = async () => {
    if (missingBrands.length === 0) return;
    if (!confirm(`Ajouter ${missingBrands.length} marque(s) manquante(s) ?`)) return;
    
    setSyncing(true);
    const brandsToInsert = missingBrands.map(name => ({ name, logo_url: '' }));
    const { error } = await supabase.from('brands').insert(brandsToInsert);
    
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      fetchBrands();
      setMissingBrands([]);
    }
    setSyncing(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    let logoUrl = editingBrand.logo_url?.trim() || '';
    if (logoUrl) {
      try {
        logoUrl = await normalizeAdminImageUrl(logoUrl, { kind: 'brand', brandId: editingBrand.id });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Échec de l'import d'image");
        return;
      }
    }
    const { error } = await supabase
      .from('brands')
      .update({ name: editingBrand.name, logo_url: logoUrl })
      .eq('id', editingBrand.id);
    if (error) {
      alert('Erreur lors de la mise à jour');
    } else {
      setEditingBrand(null);
      fetchBrands();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette marque ?')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) alert('Erreur lors de la suppression');
    else {
      fetchBrands();
      findMissingBrands();
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">Gestion des Marques</h1>

      {/* Marques manquantes */}
      {missingBrands.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-yellow-800 uppercase flex items-center gap-2">
                <AlertTriangle size={16} />
                Marques non cadastrées ({missingBrands.length})
              </h3>
              <p className="text-xs text-yellow-700 mt-1">
                Ces marques existent dans vos produits mais ne sont pas encore cadastrées
              </p>
            </div>
            <button 
              onClick={handleAddAllMissingBrands}
              disabled={syncing}
              className="bg-yellow-600 text-white font-bold py-2 px-4 rounded hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {syncing ? 'Ajout...' : `Ajouter toutes (${missingBrands.length})`}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingBrands.map(brandName => (
              <div key={brandName} className="bg-white border border-yellow-300 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800">{brandName}</span>
                <button 
                  onClick={() => handleAddMissingBrand(brandName)}
                  className="text-yellow-600 hover:text-yellow-800 font-bold"
                  title="Ajouter cette marque"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Add Form */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 md:mb-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Ajouter une nouvelle marque</h3>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Nom</label>
            <input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="Nom de la marque" 
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" 
              required 
            />
          </div>
          <div className="flex-1 md:flex-[2] space-y-2">
            <label className="block text-xs font-bold text-gray-500 mb-1">Logo (URL ou fichier)</label>
            <input 
              value={newLogo} 
              onChange={e => setNewLogo(e.target.value)} 
              placeholder="https://..." 
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" 
            />
            <input
              ref={newLogoFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const url = await uploadBrandLogo(f, 'pending');
                  setNewLogo(url);
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Erreur');
                }
              }}
            />
            <button
              type="button"
              disabled={logoUploadBusy}
              onClick={() => newLogoFileRef.current?.click()}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {logoUploadBusy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              Téléverser une image
            </button>
          </div>
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors h-[42px] w-full md:w-auto">
            Ajouter
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{brands.length} marque(s) cadastrée(s)</p>
        <button 
          onClick={() => findMissingBrands()}
          className="text-blue-600 text-sm font-medium hover:underline"
        >
          Actualiser
        </button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
        {brands.map(brand => (
          <div key={brand.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 flex flex-col items-center group hover:shadow-md transition-shadow relative">
            <div className="h-12 md:h-16 w-full flex items-center justify-center mb-2 md:mb-4 bg-gray-50 rounded p-2">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
              ) : (
                <span className="text-gray-400 text-xs">Pas de logo</span>
              )}
            </div>
            <h4 className="font-bold text-gray-800 mb-2 md:mb-3 text-center text-sm md:text-base">{brand.name}</h4>
            <div className="flex gap-2 w-full mt-auto">
              <button onClick={() => setEditingBrand(brand)} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-1.5 md:py-2 rounded hover:bg-blue-100 transition-colors">
                Modifier
              </button>
              <button onClick={() => handleDelete(brand.id)} className="bg-red-50 text-red-600 p-1.5 md:p-2 rounded hover:bg-red-100 transition-colors" title="Supprimer">
                <Trash2 size={14} className="md:hidden" />
                <Trash2 size={16} className="hidden md:block" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingBrand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">Modifier la marque</h3>
                <button onClick={() => setEditingBrand(null)} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom</label>
                <input 
                    value={editingBrand.name} 
                    onChange={e => setEditingBrand({...editingBrand, name: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
                    required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Logo (URL ou fichier)</label>
                <input 
                    value={editingBrand.logo_url || ''} 
                    onChange={e => setEditingBrand({...editingBrand, logo_url: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
                />
                <input
                  ref={editLogoFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    const brandId = editingBrand?.id;
                    if (!f || !brandId) return;
                    try {
                      const url = await uploadBrandLogo(f, brandId);
                      setEditingBrand((prev: any) =>
                        prev && prev.id === brandId ? { ...prev, logo_url: url } : prev
                      );
                    } catch (err: unknown) {
                      alert(err instanceof Error ? err.message : 'Erreur');
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={logoUploadBusy}
                  onClick={() => editLogoFileRef.current?.click()}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {logoUploadBusy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  Téléverser une image
                </button>
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-100 flex items-center justify-center h-20 md:h-24">
                 {editingBrand.logo_url ? (
                    <img src={editingBrand.logo_url} alt="Preview" className="max-h-full max-w-full object-contain" />
                 ) : (
                    <span className="text-gray-400 text-xs">Aperçu du logo</span>
                 )}
              </div>

              <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingBrand(null)} className="flex-1 text-gray-600 font-bold py-2 border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 shadow-sm">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
