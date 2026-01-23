"use client";

import React, { useEffect, useState } from 'react';
import { 
  Package, TrendingUp, DollarSign, PlusCircle, List, BarChart2, 
  LogOut, User, Loader2, Save, Edit, Trash2, Upload, Settings
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SupplierDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeProducts: 0,
    lowStock: 0,
    totalSales: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  // Profile Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    zip_code: '',
    country: 'France'
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          city: profileData.city || '',
          zip_code: profileData.zip_code || '',
          country: profileData.country || 'France'
        });
      }

      // Fetch Supplier
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      
      setSupplier(supplierData);

      // Fetch Products
      const { data: productsData } = await supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .eq('supplier_user_id', user.id)
        .order('created_at', { ascending: false });
      
      setProducts(productsData || []);

      // Fetch Sales/Revenue (through order_items)
      const { data: salesData } = await supabase
        .from('order_items')
        .select('*, orders(total_amount, created_at, status)')
        .in('product_id', productsData?.map(p => p.id) || []);
      
      // Calculate Stats
      const activeProducts = (productsData || []).filter(p => p.is_active).length;
      const lowStock = (productsData || []).filter(p => (p.stock_quantity || 0) < 10 && (p.stock_quantity || 0) > 0).length;
      const totalRevenue = (salesData || []).reduce((sum, item) => {
        if (item.orders?.status === 'completed' || item.orders?.status === 'delivered') {
          return sum + (Number(item.price) * Number(item.quantity) || 0);
        }
        return sum;
      }, 0);
      const totalSales = salesData?.length || 0;

      setStats({
        totalRevenue,
        activeProducts,
        lowStock,
        totalSales
      });
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id);

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      alert('Profil mis à jour !');
      setProfile({ ...profile, ...formData });
    }
    setSaving(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    
    const updates = {
      ...editingProduct,
      base_price: parseFloat(editingProduct.base_price) || 0,
      stock_quantity: parseInt(editingProduct.stock_quantity) || 0,
    };
    
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', editingProduct.id);

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setProducts(products.map(p => p.id === editingProduct.id ? updates : p));
      setEditingProduct(null);
      alert('Produit mis à jour !');
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  const menuItems = [
    { id: 'overview', label: 'Tableau de bord', icon: TrendingUp },
    { id: 'products', label: 'Mes Produits', icon: Package },
    { id: 'sales', label: 'Ventes & Revenus', icon: DollarSign },
    { id: 'profile', label: 'Mon Profil', icon: User },
  ];

  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-50 h-16 flex items-center justify-between px-4">
        <span className="text-lg font-bold text-gray-800">Fournisseur</span>
        <button
          onClick={() => setActiveTab(activeTab === 'menu' ? 'overview' : 'menu')}
          className="text-gray-600"
        >
          {activeTab === 'menu' ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${activeTab === 'menu' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static inset-y-0 left-0 w-64 bg-white shadow-lg z-40 flex flex-col transition-transform duration-300`}>
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-gray-800">Fournisseur</span>
          <span className="text-xs block text-gray-400 mt-1">Espace Partenaire</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === item.id ? 'bg-blue-50 text-[#0066CC]' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
        {activeTab === 'overview' && (
          <div>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Vue d'ensemble</h1>
              <Link 
                href="/dashboard/products"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold w-full sm:w-auto justify-center"
              >
                <Upload size={16} /> Importer CSV
              </Link>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs md:text-sm font-medium mb-2">Revenus Total</h3>
                <p className="text-lg md:text-3xl font-bold text-gray-800">€{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs md:text-sm font-medium mb-2">Produits Actifs</h3>
                <p className="text-lg md:text-3xl font-bold text-gray-800">{stats.activeProducts}</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs md:text-sm font-medium mb-2">Stock Faible</h3>
                <p className="text-lg md:text-3xl font-bold text-orange-500">{stats.lowStock}</p>
                <span className="text-xs text-gray-400">Articles à réapprovisionner</span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs md:text-sm font-medium mb-2">Ventes</h3>
                <p className="text-lg md:text-3xl font-bold text-gray-800">{stats.totalSales}</p>
                <span className="text-xs text-gray-400">Commandes</span>
              </div>
            </div>

            {/* Recent Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800">Produits Récents</h2>
                <button 
                  onClick={() => setActiveTab('products')}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                    <tr>
                      <th className="px-4 md:px-6 py-3">Produit</th>
                      <th className="px-4 md:px-6 py-3 hidden md:table-cell">Catégorie</th>
                      <th className="px-4 md:px-6 py-3">Prix</th>
                      <th className="px-4 md:px-6 py-3">Stock</th>
                      <th className="px-4 md:px-6 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.slice(0, 5).map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 md:px-6 py-4 font-medium text-gray-800">{product.name}</td>
                        <td className="px-4 md:px-6 py-4 hidden md:table-cell">{product.category || '-'}</td>
                        <td className="px-4 md:px-6 py-4">€{product.base_price?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 md:px-6 py-4">{product.stock_quantity || 0}</td>
                        <td className="px-4 md:px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            (product.stock_quantity || 0) > 10 ? 'bg-green-100 text-green-700' :
                            (product.stock_quantity || 0) > 0 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(product.stock_quantity || 0) > 10 ? 'En stock' :
                             (product.stock_quantity || 0) > 0 ? 'Faible' : 'Rupture'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          Aucun produit trouvé. <Link href="/dashboard/products" className="text-blue-600 hover:underline">Importer des produits</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Mes Produits</h1>
              <Link 
                href="/dashboard/products"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold w-full sm:w-auto justify-center"
              >
                <Upload size={16} /> Importer CSV
              </Link>
            </header>

            {/* Products List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {products.map((product) => (
                  <div key={product.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category || '-'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-600 p-2 hover:bg-blue-50 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 p-2 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Prix:</span>
                        <span className="font-bold ml-2">€{product.base_price?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <span className={`font-bold ml-2 ${
                          (product.stock_quantity || 0) > 10 ? 'text-green-600' :
                          (product.stock_quantity || 0) > 0 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {product.stock_quantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    Aucun produit. <Link href="/dashboard/products" className="text-blue-600 hover:underline">Importer des produits</Link>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Produit</th>
                      <th className="px-6 py-3">Catégorie</th>
                      <th className="px-6 py-3">Prix</th>
                      <th className="px-6 py-3">Stock</th>
                      <th className="px-6 py-3">Statut</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{product.name}</td>
                        <td className="px-6 py-4">{product.category || '-'}</td>
                        <td className="px-6 py-4">€{product.base_price?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4">{product.stock_quantity || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            (product.stock_quantity || 0) > 10 ? 'bg-green-100 text-green-700' :
                            (product.stock_quantity || 0) > 0 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(product.stock_quantity || 0) > 10 ? 'En stock' :
                             (product.stock_quantity || 0) > 0 ? 'Faible' : 'Rupture'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          Aucun produit trouvé. <Link href="/dashboard/products" className="text-blue-600 hover:underline">Importer des produits</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8">Ventes & Revenus</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Revenus Total</h3>
                <p className="text-3xl font-bold text-gray-800">€{stats.totalRevenue.toFixed(2)}</p>
                <span className="text-green-500 text-xs font-bold">Toutes les ventes</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Nombre de Ventes</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.totalSales}</p>
                <span className="text-gray-400 text-xs">Commandes complétées</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-gray-500 text-center">
                Les détails des ventes seront disponibles prochainement.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8">Mon Profil</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ville</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Pays</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Modifier le produit</h3>
              <button 
                onClick={() => setEditingProduct(null)} 
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Prix</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.base_price || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, base_price: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stock_quantity || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie</label>
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Auto">Auto</option>
                    <option value="Moto">Moto</option>
                    <option value="Camion">Camion</option>
                    <option value="Tracteur">Tracteur</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 text-gray-600 font-bold py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
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
