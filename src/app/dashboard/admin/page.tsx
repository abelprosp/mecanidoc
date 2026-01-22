"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, Tag, CreditCard, 
  Settings, Truck, TrendingUp, AlertTriangle, FileText, CheckCircle, 
  Percent, DollarSign, Globe, Shield, Loader2, LogOut, User, Grid, Layout, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewSection />;
      case 'products': return <ProductsSection />;
      case 'brands': return <BrandsSection />;
      case 'pages': return <PagesSection />;
      case 'footer': return <FooterSection />;
      case 'settings': return <SettingsSection />;
      case 'approvals': return <ApprovalsSection />;
      case 'profile': return <ProfileSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-6 border-b">
          <span className="text-2xl font-bold text-[#0066CC]">MecaniDoc</span>
          <span className="text-xs block text-gray-400 mt-1">MASTER ADMIN</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Package size={20} /> Gestion Produits
          </button>
          <button onClick={() => setActiveTab('brands')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'brands' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Grid size={20} /> Marques
          </button>
          <button onClick={() => setActiveTab('pages')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pages' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Layout size={20} /> Pages Catégories
          </button>
          <button onClick={() => setActiveTab('footer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'footer' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Globe size={20} /> Pied de page
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Settings size={20} /> Configuration Globale
          </button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'approvals' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CheckCircle size={20} /> Approbations
          </button>
        </nav>
        <div className="p-4 border-t space-y-1">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <User size={20} /> Mon Profil
          </button>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {renderContent()}
      </main>
    </div>
  );
}

function OverviewSection() {
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, clientsCount: 0, pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: orders } = await supabase.from('orders').select('total_amount');
        const revenue = orders?.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0) || 0;
        const ordersCount = orders?.length || 0;
        const { count: clientsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer');
        const { count: pendingGarages } = await supabase.from('garages').select('*', { count: 'exact', head: true }).eq('is_approved', false);
        const { count: pendingSuppliers } = await supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_approved', false);
        setStats({ revenue, ordersCount, clientsCount: clientsCount || 0, pendingApprovals: (pendingGarages || 0) + (pendingSuppliers || 0) });
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <header className="flex justify-between items-center mb-8"><h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1></header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-gray-500 text-sm font-medium">Revenu Total</h3><p className="text-2xl font-bold text-gray-800">€{stats.revenue.toFixed(2)}</p></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-gray-500 text-sm font-medium">Commandes</h3><p className="text-2xl font-bold text-gray-800">{stats.ordersCount}</p></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-gray-500 text-sm font-medium">Clients</h3><p className="text-2xl font-bold text-gray-800">{stats.clientsCount}</p></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-gray-500 text-sm font-medium">Approbations</h3><p className="text-2xl font-bold text-gray-800">{stats.pendingApprovals}</p></div>
      </div>
    </>
  );
}

function ProductsSection() {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: brandsData } = await supabase.from('brands').select('*').order('name', { ascending: true });
      setProducts(productsData || []);
      setBrands(brandsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const selectedBrand = brands.find(b => b.id === editingProduct.brand_id);
    const updates = { ...editingProduct, brand: selectedBrand ? selectedBrand.name : editingProduct.brand };
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id);
    if (!error) { setProducts(products.map(p => p.id === editingProduct.id ? updates : p)); setEditingProduct(null); }
    setSaving(false);
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Produits</h1>
        <Link href="/dashboard/products" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">Importer / Ajouter (CSV)</Link>
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><th className="px-6 py-4">Produit</th><th className="px-6 py-4">Prix</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 font-bold">{product.name}</td>
                  <td className="px-6 py-4">€{product.base_price}</td>
                  <td className="px-6 py-4">{product.stock_quantity}</td>
                  <td className="px-6 py-4"><button onClick={() => setEditingProduct({...product})} className="text-blue-600 font-bold border px-3 py-1 rounded">Modifier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Modifier le produit</h3>
              <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border rounded p-2" />
              <input type="number" value={editingProduct.base_price} onChange={e => setEditingProduct({...editingProduct, base_price: parseFloat(e.target.value)})} className="w-full border rounded p-2" />
              <input type="number" value={editingProduct.stock_quantity} onChange={e => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value)})} className="w-full border rounded p-2" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">Sauvegarder</button>
              <button type="button" onClick={() => setEditingProduct(null)} className="w-full text-gray-500 mt-2">Annuler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PagesSection() {
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

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Pages Catégories</h1>
        <button onClick={handleCreateClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+ Nouvelle</button>
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="px-6 py-4">Slug</th><th className="px-6 py-4">Titre</th><th className="px-6 py-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((page) => (
              <tr key={page.id}><td className="px-6 py-4 font-mono text-blue-600">{page.slug}</td><td className="px-6 py-4">{page.seo_title}</td><td className="px-6 py-4"><button onClick={() => setEditingPage(page)} className="text-blue-600 font-bold border px-3 py-1 rounded">Modifier</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Éditer la page</h3><button onClick={() => setEditingPage(null)}>&times;</button></div>
            <form onSubmit={handleSavePage} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Slug (ex: pneus-4-saisons)" value={editingPage.slug} onChange={e => setEditingPage({...editingPage, slug: e.target.value})} className="border rounded p-2" required />
                <input type="text" placeholder="Titre SEO" value={editingPage.seo_title} onChange={e => setEditingPage({...editingPage, seo_title: e.target.value})} className="border rounded p-2" />
              </div>
              <input type="text" placeholder="Image Hero URL" value={editingPage.hero_image} onChange={e => setEditingPage({...editingPage, hero_image: e.target.value})} className="w-full border rounded p-2" />
              <textarea placeholder="Texte SEO" value={editingPage.seo_text} onChange={e => setEditingPage({...editingPage, seo_text: e.target.value})} className="w-full border rounded p-2 h-24" />
              
              <h4 className="font-bold">Bannières Promo</h4>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="border p-2 rounded bg-gray-50 space-y-2">
                    <input type="text" placeholder="Titre" value={editingPage.promo_banners?.[idx]?.title || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].title=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-1 text-xs" />
                    <input type="text" placeholder="Sous-titre" value={editingPage.promo_banners?.[idx]?.subtitle || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].subtitle=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-1 text-xs" />
                    <input type="text" placeholder="Image URL" value={editingPage.promo_banners?.[idx]?.image || ''} onChange={e => {const b = [...(editingPage.promo_banners||[])]; if(!b[idx]) b[idx]={}; b[idx].image=e.target.value; setEditingPage({...editingPage, promo_banners: b})}} className="w-full border rounded p-1 text-xs" />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingPage(null)} className="px-4 py-2 border rounded">Annuler</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sauvegarder</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandsSection() {
  const supabase = createClient();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [editingBrand, setEditingBrand] = useState<any>(null);

  const fetchBrands = async () => {
    const { data } = await supabase.from('brands').select('*').order('name');
    setBrands(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('brands').insert([{ name: newName, logo_url: newLogo }]);
    if (error) {
      alert('Erreur lors de l\'ajout de la marque');
    } else {
      setNewName('');
      setNewLogo('');
      fetchBrands();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    const { error } = await supabase.from('brands').update({ name: editingBrand.name, logo_url: editingBrand.logo_url }).eq('id', editingBrand.id);
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
    else fetchBrands();
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gestion des Marques</h1>
      
      {/* Add Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Ajouter une nouvelle marque</h3>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
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
          <div className="flex-[2]">
            <label className="block text-xs font-bold text-gray-500 mb-1">Logo URL</label>
            <input 
              value={newLogo} 
              onChange={e => setNewLogo(e.target.value)} 
              placeholder="https://..." 
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" 
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors h-[42px]">Ajouter</button>
        </form>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {brands.map(brand => (
          <div key={brand.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center group hover:shadow-md transition-shadow relative">
            <div className="h-16 w-full flex items-center justify-center mb-4 bg-gray-50 rounded p-2">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
              ) : (
                <span className="text-gray-400 text-xs">Pas de logo</span>
              )}
            </div>
            <h4 className="font-bold text-gray-800 mb-3 text-center">{brand.name}</h4>
            <div className="flex gap-2 w-full mt-auto">
              <button onClick={() => setEditingBrand(brand)} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-2 rounded hover:bg-blue-100 transition-colors">Modifier</button>
              <button onClick={() => handleDelete(brand.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 transition-colors" title="Supprimer">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingBrand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">Modifier la marque</h3>
                <button onClick={() => setEditingBrand(null)} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nom</label>
                <input 
                    value={editingBrand.name} 
                    onChange={e => setEditingBrand({...editingBrand, name: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
                    required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Logo URL</label>
                <input 
                    value={editingBrand.logo_url || ''} 
                    onChange={e => setEditingBrand({...editingBrand, logo_url: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
                />
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-100 flex items-center justify-center h-24">
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

function SettingsSection() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  useEffect(() => { const f = async () => { const { data } = await supabase.from('global_settings').select('*').single(); setSettings(data || {}); }; f(); }, []);
  const handleSave = async () => { if(settings.id) await supabase.from('global_settings').update(settings).eq('id', settings.id); else await supabase.from('global_settings').insert([settings]); alert('Saved'); };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-2">
        <label>TVA (%)</label><input type="number" value={settings.default_tax_rate||''} onChange={e=>setSettings({...settings, default_tax_rate: e.target.value})} className="border p-2 block" />
        <label>Frais Livraison</label><input type="number" value={settings.delivery_base_fee||''} onChange={e=>setSettings({...settings, delivery_base_fee: e.target.value})} className="border p-2 block" />
        <button onClick={handleSave} className="bg-blue-600 text-white p-2 mt-2">Sauvegarder</button>
      </div>
    </div>
  );
}

function FooterSection() {
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
    institutional: 'Institutionnel'
  };

  return (
    <div>
       <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Gestion du Pied de page</h1>
        <button onClick={() => { setIsAdding(true); setEditingLink({ section: 'products', sort_order: 0, is_active: true }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+ Nouveau Lien</button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {Object.entries(sections).map(([key, label]) => (
           <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-blue-600 mb-4 uppercase text-xs tracking-wider">{label}</h3>
              <ul className="space-y-2">
                 {links.filter(l => l.section === key).sort((a,b) => a.sort_order - b.sort_order).map(link => (
                    <li key={link.id} className="flex justify-between items-center bg-gray-50 p-2 rounded group">
                       <div>
                          <p className="font-bold text-sm text-gray-800">{link.title}</p>
                          <p className="text-xs text-gray-400">{link.url || `/page/${link.slug}`}</p>
                       </div>
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button onClick={() => setEditingLink(link)} className="text-blue-600 p-1"><Settings size={14} /></button>
                          <button onClick={() => handleDelete(link.id)} className="text-red-600 p-1"><Trash2 size={14} /></button>
                       </div>
                    </li>
                 ))}
              </ul>
           </div>
        ))}
      </div>

      {(editingLink || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
             <h3 className="font-bold text-lg mb-4">{editingLink?.id ? 'Modifier' : 'Ajouter'} un lien</h3>
             <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.target as HTMLFormElement);
                 const data = Object.fromEntries(formData.entries());
                 handleSave(e, { ...editingLink, ...data, is_active: true });
             }} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500">Titre</label>
                   <input name="title" defaultValue={editingLink?.title} className="w-full border rounded p-2" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500">URL (ex: /auth/login)</label>
                      <input name="url" defaultValue={editingLink?.url} className="w-full border rounded p-2" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500">Slug (ex: qui-sommes-nous)</label>
                      <input name="slug" defaultValue={editingLink?.slug} className="w-full border rounded p-2" />
                   </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500">Section</label>
                    <select name="section" defaultValue={editingLink?.section} className="w-full border rounded p-2">
                       <option value="products">Produits et Services</option>
                       <option value="terms">Termes et Conditions</option>
                       <option value="institutional">Institutionnel</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500">Ordre</label>
                    <input name="sort_order" type="number" defaultValue={editingLink?.sort_order || 0} className="w-full border rounded p-2" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500">Contenu (HTML)</label>
                    <textarea name="content" defaultValue={editingLink?.content} className="w-full border rounded p-2 h-24" placeholder="<p>Contenu de la page...</p>"></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                   <button type="button" onClick={() => { setEditingLink(null); setIsAdding(false); }} className="px-4 py-2 border rounded">Annuler</button>
                   <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sauvegarder</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalsSection() { return <div>Approvals Section (Placeholder)</div>; }
function ProfileSection() { return <div>Profile Section (Placeholder)</div>; }
