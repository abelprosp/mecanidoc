"use client";

import React, { useEffect, useState } from 'react';
import { 
  Package, MapPin, CreditCard, Heart, LogOut, Loader2, Save, User 
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      // Fetch Orders
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            products (
              name,
              images
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
      }
      
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
      alert('Erreur lors de la mise à jour du profil');
      console.error(error);
    } else {
      alert('Profil mis à jour avec succès');
      setProfile({ ...profile, ...formData });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-[#F1F1F1]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg uppercase">
                {profile?.full_name ? profile.full_name.charAt(0) : user?.email?.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-gray-800 truncate">{profile?.full_name || 'Client'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Package size={18} /> Mes Commandes
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <User size={18} /> Mon Profil & Adresses
              </button>
              <button 
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed"
                disabled
              >
                <CreditCard size={18} /> Moyens de paiement (Bientôt)
              </button>
              <div className="border-t border-gray-100 my-2"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
              >
                <LogOut size={18} /> Déconnexion
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3 space-y-6">
          
          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Historique des commandes</h1>
              
              {orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex gap-8 text-sm">
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Date de commande</span>
                            <span className="font-medium text-gray-800">{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Total</span>
                            <span className="font-medium text-gray-800">€{order.total_amount?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">N° de commande</span>
                            <span className="font-medium text-gray-800 text-xs">{order.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status === 'pending' ? 'En traitement' : order.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        {order.order_items && order.order_items.length > 0 ? (
                          order.order_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4 mb-4 last:mb-0">
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {item.products?.images?.[0] ? (
                                  <img src={item.products.images[0]} alt={item.products.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{item.products?.name || 'Produit inconnu'}</p>
                                <p className="text-sm text-gray-500">Quantité: {item.quantity} x €{item.price}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">Détails des articles non disponibles.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Package className="mx-auto mb-4 opacity-20" size={48} />
                  <p>Vous n'avez pas encore passé de commande.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Mon Profil & Adresses</h1>
              
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nom complet</label>
                    <input 
                      type="text" 
                      value={formData.full_name} 
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" /> Adresse de livraison par défaut
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Adresse</label>
                      <input 
                        type="text" 
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Numéro et nom de rue"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ville</label>
                        <input 
                          type="text" 
                          value={formData.city} 
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Code Postal</label>
                        <input 
                          type="text" 
                          value={formData.zip_code} 
                          onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Pays</label>
                        <select 
                          value={formData.country} 
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                          <option value="France">France</option>
                          <option value="Belgique">Belgique</option>
                          <option value="Luxembourg">Luxembourg</option>
                        </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving && <Loader2 className="animate-spin" size={18} />}
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
