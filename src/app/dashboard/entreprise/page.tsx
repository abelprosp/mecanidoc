"use client";

import React, { useEffect, useState } from 'react';
import { 
  Building2, ShoppingCart, Percent, FileText, LogOut, Loader2, Save, User 
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
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
    country: 'France',
    // Company specifics
    company_name: '',
    vat_number: ''
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
      
      setProfile(profileData);

      // Fetch Company Details
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      
      setCompany(companyData);

      if (profileData) {
        setFormData(prev => ({
          ...prev,
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          city: profileData.city || '',
          zip_code: profileData.zip_code || '',
          country: profileData.country || 'France',
          company_name: companyData?.company_name || '',
          vat_number: companyData?.vat_number || ''
        }));
      }

      // Fetch Orders
      const { data: ordersData } = await supabase
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
    
    // Update Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        zip_code: formData.zip_code,
        country: formData.country
      })
      .eq('id', user.id);

    // Update Company
    let companyError = null;
    if (company) {
      const { error } = await supabase
        .from('companies')
        .update({
          company_name: formData.company_name,
          vat_number: formData.vat_number
        })
        .eq('id', company.id);
      companyError = error;
    } else {
        // Create company record if missing (unlikely for pro role, but safe fallback)
        const { error } = await supabase
        .from('companies')
        .insert({
          profile_id: user.id,
          company_name: formData.company_name,
          vat_number: formData.vat_number,
          discount_tier: 5.0 // Default
        });
        companyError = error;
    }

    if (profileError || companyError) {
      alert('Erreur lors de la mise à jour: ' + (profileError?.message || companyError?.message));
    } else {
      alert('Profil entreprise mis à jour avec succès');
      // Refresh local state if needed
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
    <div className="flex h-screen bg-[#F1F1F1]">
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-gray-800">Espace Pro</span>
          <span className="text-xs block text-gray-400 mt-1">{company?.company_name || 'Entreprise'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ShoppingCart size={20} /> Commandes
          </button>
          <button 
            onClick={() => setActiveTab('discounts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'discounts' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Percent size={20} /> Mes Remises
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Building2 size={20} /> Profil Entreprise
          </button>
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        
        {activeTab === 'orders' && (
          <div className="space-y-6">
             <div className="bg-blue-600 rounded-xl p-8 text-white shadow-lg flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Bienvenue, {company?.company_name || 'Partenaire'}</h1>
                <p className="opacity-90">Statut: <span className="font-bold text-yellow-300">Professionnel</span></p>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-sm opacity-75">Remise active</p>
                  <p className="text-4xl font-bold">{company?.discount_tier || 0}%</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg text-gray-800 mb-6">Historique des commandes</h2>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                         <div>
                            <p className="font-bold text-gray-800">Commande #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                         </div>
                         <div className="text-right">
                            <p className="font-bold text-gray-800">€{order.total_amount?.toFixed(2)}</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {order.status}
                            </span>
                         </div>
                      </div>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-2">
                              <span>{item.quantity}x {item.products?.name}</span>
                              <span>€{item.price}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Aucune commande professionnelle pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'discounts' && (
           <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-800">Mes Avantages Pro</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-bold text-gray-800 mb-4">Niveau de Remise Actuel</h2>
                    <div className="flex items-center justify-center h-40 bg-blue-50 rounded-lg border border-blue-100 flex-col">
                        <span className="text-5xl font-bold text-blue-600">{company?.discount_tier || 0}%</span>
                        <span className="text-sm text-blue-500 mt-2 font-medium">Sur tout le catalogue</span>
                    </div>
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-bold text-gray-800 mb-4">Conditions</h2>
                    <ul className="space-y-3 text-sm text-gray-600">
                       <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Paiement à 30 jours (sous réserve d'approbation)</li>
                       <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Livraison prioritaire gratuite</li>
                       <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Service client dédié</li>
                    </ul>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'profile' && (
           <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-800">Profil Entreprise</h1>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl">
                 <form onSubmit={handleSaveProfile} className="space-y-6">
                    
                    <div className="border-b pb-4 mb-4">
                       <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Informations Société</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Raison Sociale</label>
                            <input 
                              type="text" 
                              value={formData.company_name} 
                              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Numéro SIRET / TVA</label>
                            <input 
                              type="text" 
                              value={formData.vat_number} 
                              onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                       </div>
                    </div>

                    <div className="border-b pb-4 mb-4">
                       <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Contact Responsable</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nom Complet</label>
                            <input 
                              type="text" 
                              value={formData.full_name} 
                              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                            <input 
                              type="tel" 
                              value={formData.phone} 
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                       </div>
                    </div>

                    <div>
                       <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Adresse de Facturation</h3>
                       <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Adresse</label>
                            <input 
                              type="text" 
                              value={formData.address} 
                              onChange={(e) => setFormData({...formData, address: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Ville</label>
                                <input 
                                  type="text" 
                                  value={formData.city} 
                                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Code Postal</label>
                                <input 
                                  type="text" 
                                  value={formData.zip_code} 
                                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                />
                             </div>
                          </div>
                          <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pays</label>
                                <select 
                                  value={formData.country} 
                                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                                >
                                  <option value="France">France</option>
                                  <option value="Belgique">Belgique</option>
                                  <option value="Luxembourg">Luxembourg</option>
                                </select>
                          </div>
                       </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={saving}
                      className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {saving && <Loader2 className="animate-spin" size={18} />}
                      Enregistrer les modifications
                    </button>
                 </form>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}
