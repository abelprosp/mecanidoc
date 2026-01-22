"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, Tag, CreditCard, 
  Settings, Truck, TrendingUp, AlertTriangle, FileText, CheckCircle, 
  Percent, DollarSign, Globe, Shield, Loader2, LogOut, User, Grid, Layout, Trash2,
  Menu, X
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
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

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: "Vue d'ensemble" },
    { id: 'products', icon: Package, label: 'Gestion Produits' },
    { id: 'brands', icon: Grid, label: 'Marques' },
    { id: 'pages', icon: Layout, label: 'Pages Catégories' },
    { id: 'footer', icon: Globe, label: 'Pied de page' },
    { id: 'settings', icon: Settings, label: 'Configuration Globale' },
    { id: 'approvals', icon: CheckCircle, label: 'Approbations' },
  ];

  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-40 md:hidden">
        <div className="flex items-center justify-between p-4">
          <div>
            <span className="text-xl font-bold text-[#0066CC]">MecaniDoc</span>
            <span className="text-xs block text-gray-400">MASTER ADMIN</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#0066CC]">MecaniDoc</span>
            <span className="text-xs block text-gray-400">MASTER ADMIN</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => handleTabChange(item.id)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t space-y-1">
          <button onClick={() => handleTabChange('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}>
            <User size={20} /> Mon Profil
          </button>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-6 border-b">
          <span className="text-2xl font-bold text-[#0066CC]">MecaniDoc</span>
          <span className="text-xs block text-gray-400 mt-1">MASTER ADMIN</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
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

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tableau de Bord</h1>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-xs md:text-sm font-medium">Revenu Total</h3>
          <p className="text-lg md:text-2xl font-bold text-gray-800">€{stats.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-xs md:text-sm font-medium">Commandes</h3>
          <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.ordersCount}</p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-xs md:text-sm font-medium">Clients</h3>
          <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.clientsCount}</p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-xs md:text-sm font-medium">Approbations</h3>
          <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.pendingApprovals}</p>
        </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const categories = ['Auto', 'Moto', 'Camion', 'Tracteur'];

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
    const updates = { 
      ...editingProduct, 
      brand: selectedBrand ? selectedBrand.name : editingProduct.brand,
      base_price: parseFloat(editingProduct.base_price) || 0,
      stock_quantity: parseInt(editingProduct.stock_quantity) || 0,
    };
    
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setProducts(products.map(p => p.id === editingProduct.id ? updates : p));
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
              {product.image_url && (
                <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-contain rounded" />
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
              <button onClick={() => setEditingProduct({...product})} className="flex-1 text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded text-sm hover:bg-blue-50">
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
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain rounded" />
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
                      <button onClick={() => setEditingProduct({...product})} className="text-blue-600 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">
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
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">URL de l'image</label>
                  <input 
                    type="text" 
                    value={editingProduct.image_url || ''} 
                    onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
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
                    value={editingProduct.season || ''} 
                    onChange={e => setEditingProduct({...editingProduct, season: e.target.value})}
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
          <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="px-6 py-4">Slug</th><th className="px-6 py-4">Titre</th><th className="px-6 py-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((page) => (
              <tr key={page.id}><td className="px-6 py-4 font-mono text-blue-600">{page.slug}</td><td className="px-6 py-4">{page.seo_title}</td><td className="px-6 py-4"><button onClick={() => setEditingPage(page)} className="text-blue-600 font-bold border px-3 py-1 rounded">Modifier</button></td></tr>
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

function BrandsSection() {
  const supabase = createClient();
  const [brands, setBrands] = useState<any[]>([]);
  const [missingBrands, setMissingBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [editingBrand, setEditingBrand] = useState<any>(null);

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
      const existingNames = new Set(existingBrands.map(b => b.name?.toLowerCase().trim()));
      
      // Encontrar marcas únicas dos produtos que não existem
      const productBrands = new Set<string>();
      products.forEach(p => {
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
    const { error } = await supabase.from('brands').insert([{ name: newName, logo_url: newLogo }]);
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
          <div className="flex-1 md:flex-[2]">
            <label className="block text-xs font-bold text-gray-500 mb-1">Logo URL</label>
            <input 
              value={newLogo} 
              onChange={e => setNewLogo(e.target.value)} 
              placeholder="https://..." 
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" 
            />
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
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Logo URL</label>
                <input 
                    value={editingBrand.logo_url || ''} 
                    onChange={e => setEditingBrand({...editingBrand, logo_url: e.target.value})} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
                />
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

function SettingsSection() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    const f = async () => { 
      const { data } = await supabase.from('global_settings').select('*').single(); 
      setSettings(data || {}); 
      setLoading(false);
    }; 
    f(); 
  }, []);

  const handleSave = async () => { 
    setSaving(true);
    if(settings.id) await supabase.from('global_settings').update(settings).eq('id', settings.id); 
    else await supabase.from('global_settings').insert([settings]); 
    setSaving(false);
    alert('Paramètres sauvegardés'); 
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">Configuration Globale</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">TVA (%)</label>
            <input 
              type="number" 
              value={settings.default_tax_rate||''} 
              onChange={e=>setSettings({...settings, default_tax_rate: e.target.value})} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
              placeholder="20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Frais de Livraison (€)</label>
            <input 
              type="number" 
              value={settings.delivery_base_fee||''} 
              onChange={e=>setSettings({...settings, delivery_base_fee: e.target.value})} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
              placeholder="5.99"
            />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 w-full md:w-auto"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
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

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
       <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion du Pied de page</h1>
        <button onClick={() => { setIsAdding(true); setEditingLink({ section: 'products', sort_order: 0, is_active: true }); }} className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto">
          + Nouveau Lien
        </button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
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
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Ordre</label>
                      <input name="sort_order" type="number" defaultValue={editingLink?.sort_order || 0} className="w-full border rounded p-2" />
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Contenu (HTML)</label>
                    <textarea name="content" defaultValue={editingLink?.content} className="w-full border rounded p-2 h-24" placeholder="<p>Contenu de la page...</p>"></textarea>
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

function ApprovalsSection() { 
  const supabase = createClient();
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase.from('garages').select('*').eq('is_approved', false).order('created_at', { ascending: false });
      setGarages(data || []);
      setLoading(false);
    };
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    await supabase.from('garages').update({ is_approved: true }).eq('id', id);
    setGarages(garages.filter(g => g.id !== id));
  };

  const handleReject = async (id: string) => {
    if(!confirm('Rejeter cette demande ?')) return;
    await supabase.from('garages').delete().eq('id', id);
    setGarages(garages.filter(g => g.id !== id));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">Approbations en attente</h1>
      {garages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
          <p className="text-gray-600">Aucune approbation en attente</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {garages.map(garage => (
            <div key={garage.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{garage.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{garage.address}, {garage.city} {garage.zip_code}</p>
                  <p className="text-gray-500 text-sm">{garage.phone_primary}</p>
                  <p className="text-gray-400 text-xs mt-2">Demandé le: {new Date(garage.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleApprove(garage.id)} className="flex-1 md:flex-none bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm">
                    Approuver
                  </button>
                  <button onClick={() => handleReject(garage.id)} className="flex-1 md:flex-none bg-red-100 text-red-600 font-bold py-2 px-4 rounded hover:bg-red-200 transition-colors text-sm">
                    Rejeter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSection() { 
  const supabase = createClient();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data || { id: user.id, email: user.email });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('profiles').upsert(profile);
    setSaving(false);
    alert('Profil mis à jour');
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">Mon Profil</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Nom complet</label>
            <input 
              type="text" 
              value={profile.full_name || ''} 
              onChange={e => setProfile({...profile, full_name: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
            <input 
              type="email" 
              value={profile.email || ''} 
              disabled
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Téléphone</label>
            <input 
              type="tel" 
              value={profile.phone || ''} 
              onChange={e => setProfile({...profile, phone: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
            />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 w-full md:w-auto"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
