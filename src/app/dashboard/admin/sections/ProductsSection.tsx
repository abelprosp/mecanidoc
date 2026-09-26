"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Package, Loader2, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { normalizeAdminImageUrl } from './shared';

export default function ProductsSection() {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [productImageUploadBusy, setProductImageUploadBusy] = useState(false);
  const productImageFileRef = useRef<HTMLInputElement>(null);

  const uploadProductImage = async (file: File, productId: string) => {
    setProductImageUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('productId', productId);
      const res = await fetch('/api/admin/product-image', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Échec du téléversement');
      if (!data.url) throw new Error('Réponse invalide du serveur');
      return data.url as string;
    } finally {
      setProductImageUploadBusy(false);
    }
  };

  const categories = ['Auto', 'Moto', 'Camion', 'Tracteur'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: productsData } = await supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .order('created_at', { ascending: false });
      const { data: brandsData } = await supabase.from('brands').select('*').order('name', { ascending: true });
      
      // Transformar products para adicionar image_url a partir de images[0]
      const transformedProducts = (productsData || []).map((product: any) => ({
        ...product,
        image_url: product.images && Array.isArray(product.images) && product.images.length > 0 
          ? product.images[0] 
          : product.image_url || null
      }));
      
      setProducts(transformedProducts);
      setBrands(brandsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let resolvedImageUrl = editingProduct.image_url?.trim() || '';
    if (resolvedImageUrl) {
      try {
        resolvedImageUrl = await normalizeAdminImageUrl(resolvedImageUrl, {
          kind: 'product',
          productId: editingProduct.id,
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Échec de l'import d'image");
        setSaving(false);
        return;
      }
    }

    const selectedBrand = brands.find(b => b.id === editingProduct.brand_id);
    
    // Processar specs - incluir season e autres_categories
    let processedSpecs = { ...(editingProduct.specs || {}) };
    
    // Se season foi definido no formulário, adicionar aos specs
    if (editingProduct.season) {
      processedSpecs.season = editingProduct.season;
    }
    
    // Processar autres_categories se for string
    if (processedSpecs.autres_categories && typeof processedSpecs.autres_categories === 'string') {
      processedSpecs.autres_categories = processedSpecs.autres_categories
        .split(/[,;|]/)
        .map((cat: string) => cat.trim())
        .filter((cat: string) => cat.length > 0);
    }
    
    // Criar objeto de atualização apenas com campos válidos da tabela products
    // Remover campos relacionados (brands) e outros campos que não devem ser atualizados
    const updates: any = {
      name: editingProduct.name,
      description: editingProduct.description || null,
      brand_id: editingProduct.brand_id || null,
      brand: selectedBrand ? selectedBrand.name : editingProduct.brand || null,
      category: editingProduct.category || null,
      base_price: parseFloat(editingProduct.base_price) || 0,
      sale_price: editingProduct.sale_price ? parseFloat(editingProduct.sale_price) : null,
      stock_quantity: parseInt(editingProduct.stock_quantity) || 0,
      specs: processedSpecs,
      labels: editingProduct.labels || null,
      pa_tipo: editingProduct.pa_tipo || null,
      ean: editingProduct.ean || null,
      shipping_cost: editingProduct.shipping_cost ? parseFloat(editingProduct.shipping_cost) : null,
    };
    
    // Se image_url foi fornecido, atualizar o array images
    if (resolvedImageUrl) {
      updates.images = [resolvedImageUrl];
    } else if (editingProduct.images && Array.isArray(editingProduct.images)) {
      updates.images = editingProduct.images;
    }
    
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      // Atualizar a lista de produtos com os dados atualizados
      const updatedProduct = {
        ...editingProduct,
        ...updates,
        image_url: resolvedImageUrl || editingProduct.image_url,
      };
      setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
      setEditingProduct(null);
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // Filtrer les produits
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category?.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion des Produits</h1>
        <Link href="/dashboard/products" className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold hover:bg-blue-700 text-sm md:text-base w-full sm:w-auto text-center">
          Importer / Ajouter (CSV)
        </Link>
      </header>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom ou marque..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">{filteredProducts.length} produit(s) trouvé(s)</p>
      </div>
      
      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex gap-3">
              {(product.image_url || (product.images && product.images[0])) && (
                <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                  <img src={product.image_url || product.images[0]} alt={product.name} className="w-full h-full object-contain rounded" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 truncate">{product.name}</h4>
                <p className="text-xs text-gray-500">{product.brand} • {product.category}</p>
                <div className="flex gap-3 text-sm text-gray-600 mt-1">
                  <span>€{product.base_price}</span>
                  <span className={`${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Stock: {product.stock_quantity}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => {
                // Garantir que image_url seja definido a partir de images[0] se necessário
                // E garantir que season seja acessível no nível do produto a partir de specs
                const productToEdit = {
                  ...product,
                  image_url: product.image_url || (product.images && product.images[0] ? product.images[0] : ''),
                  season: product.specs?.season || product.season || ''
                };
                setEditingProduct(productToEdit);
              }} className="flex-1 text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded text-sm hover:bg-blue-50">
                Modifier
              </button>
              <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 border border-red-200 px-3 py-1.5 rounded text-sm hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4">Image</th>
                <th className="px-4 py-4">Produit</th>
                <th className="px-4 py-4">Marque</th>
                <th className="px-4 py-4">Catégorie</th>
                <th className="px-4 py-4">Prix</th>
                <th className="px-4 py-4">Stock</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      {(product.image_url || (product.images && product.images[0])) ? (
                        <img src={product.image_url || product.images[0]} alt={product.name} className="w-full h-full object-contain rounded" />
                      ) : (
                        <Package size={20} className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-800">{product.name}</p>
                    {product.specs && (
                      <p className="text-xs text-gray-500">{product.specs.width}/{product.specs.height} R{product.specs.diameter}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.brand || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                      {product.category || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">€{product.base_price}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock_quantity > 10 ? 'bg-green-50 text-green-600' : product.stock_quantity > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => {
                        // Garantir que image_url seja definido a partir de images[0] se necessário
                        // E garantir que season seja acessível no nível do produto a partir de specs
                        const productToEdit = {
                          ...product,
                          image_url: product.image_url || (product.images && product.images[0] ? product.images[0] : ''),
                          season: product.specs?.season || product.season || ''
                        };
                        setEditingProduct(productToEdit);
                      }} className="text-blue-600 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">
                        Modifier
                      </button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 border border-red-200 p-1 rounded hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'édition */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">Modifier le produit</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-4 md:p-6 space-y-4">
              {/* Aperçu de l'image */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-20 h-20 bg-white border rounded flex items-center justify-center flex-shrink-0">
                  {editingProduct.image_url ? (
                    <img src={editingProduct.image_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Package size={32} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Image (URL ou fichier)</label>
                  <input 
                    type="text" 
                    value={editingProduct.image_url || ''} 
                    onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                  <input
                    ref={productImageFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      const pid = editingProduct?.id;
                      if (!f || !pid) return;
                      try {
                        const url = await uploadProductImage(f, pid);
                        setEditingProduct((prev: any) =>
                          prev && prev.id === pid ? { ...prev, image_url: url } : prev
                        );
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Erreur');
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={productImageUploadBusy}
                    onClick={() => productImageFileRef.current?.click()}
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {productImageUploadBusy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    Téléverser une image
                  </button>
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom du produit *</label>
                <input 
                  type="text" 
                  value={editingProduct.name || ''} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                <textarea 
                  value={editingProduct.description || ''} 
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} 
                  className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                  placeholder="Description du produit..."
                />
              </div>

              {/* Marque et Catégorie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Marque</label>
                  <select 
                    value={editingProduct.brand_id || ''} 
                    onChange={e => {
                      const brandId = e.target.value;
                      const brand = brands.find(b => b.id === brandId);
                      setEditingProduct({...editingProduct, brand_id: brandId, brand: brand?.name || ''});
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Sélectionner une marque</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie</label>
                  <select 
                    value={editingProduct.category || ''} 
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prix et Stock */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Prix (€) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingProduct.base_price || ''} 
                    onChange={e => setEditingProduct({...editingProduct, base_price: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Prix promo (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingProduct.promo_price || ''} 
                    onChange={e => setEditingProduct({...editingProduct, promo_price: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Stock *</label>
                  <input 
                    type="number" 
                    value={editingProduct.stock_quantity || ''} 
                    onChange={e => setEditingProduct({...editingProduct, stock_quantity: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Saison</label>
                  <select 
                    value={editingProduct.season || editingProduct.specs?.season || ''} 
                    onChange={e => {
                      const seasonValue = e.target.value;
                      // Atualizar tanto no nível do produto quanto nos specs
                      setEditingProduct({
                        ...editingProduct, 
                        season: seasonValue,
                        specs: {
                          ...(editingProduct.specs || {}),
                          season: seasonValue || undefined
                        }
                      });
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">-</option>
                    <option value="summer">Été</option>
                    <option value="winter">Hiver</option>
                    <option value="all-season">4 Saisons</option>
                  </select>
                </div>
              </div>

              {/* Spécifications pneu */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Spécifications du pneu</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Largeur</label>
                    <input 
                      type="text" 
                      value={editingProduct.specs?.width || ''} 
                      onChange={e => setEditingProduct({...editingProduct, specs: {...(editingProduct.specs || {}), width: e.target.value}})} 
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="205"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hauteur</label>
                    <input 
                      type="text" 
                      value={editingProduct.specs?.height || ''} 
                      onChange={e => setEditingProduct({...editingProduct, specs: {...(editingProduct.specs || {}), height: e.target.value}})} 
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Diamètre</label>
                    <input 
                      type="text" 
                      value={editingProduct.specs?.diameter || ''} 
                      onChange={e => setEditingProduct({...editingProduct, specs: {...(editingProduct.specs || {}), diameter: e.target.value}})} 
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Charge</label>
                    <input 
                      type="text" 
                      value={editingProduct.specs?.load_index || ''} 
                      onChange={e => setEditingProduct({...editingProduct, specs: {...(editingProduct.specs || {}), load_index: e.target.value}})} 
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="91"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Vitesse</label>
                    <input 
                      type="text" 
                      value={editingProduct.specs?.speed_index || ''} 
                      onChange={e => setEditingProduct({...editingProduct, specs: {...(editingProduct.specs || {}), speed_index: e.target.value}})} 
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="V"
                    />
                  </div>
                </div>

                {/* Autres catégories */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Autres catégories</label>
                  <input 
                    type="text" 
                    value={(() => {
                      const autresCat = editingProduct.specs?.autres_categories;
                      if (Array.isArray(autresCat)) {
                        return autresCat.join(', ');
                      }
                      return autresCat || '';
                    })()} 
                    onChange={e => {
                      const value = e.target.value;
                      // Converter string para array ao salvar
                      const autresCategories = value
                        .split(/[,;|]/)
                        .map(cat => cat.trim())
                        .filter(cat => cat.length > 0);
                      
                      setEditingProduct({
                        ...editingProduct, 
                        specs: {
                          ...(editingProduct.specs || {}), 
                          autres_categories: autresCategories
                        }
                      });
                    }} 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Ex: XL, M+S, Runflat (séparés par virgule)"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Séparez les catégories par virgule (ex: XL, M+S, Runflat)
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setEditingProduct(null)} 
                  className="flex-1 text-gray-600 font-bold py-2.5 border border-gray-300 rounded hover:bg-gray-50 order-2 sm:order-1"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded font-bold hover:bg-blue-700 disabled:opacity-50 order-1 sm:order-2"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
