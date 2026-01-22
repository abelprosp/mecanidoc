"use client";

import React, { useEffect, useState } from 'react';
import { 
  Wrench, MapPin, Calendar, DollarSign, UserCheck, Star, Save, Loader2, LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function GarageDashboard() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [garage, setGarage] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zip_code: '',
    phone_primary: '',
    email: '',
    hourly_rate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Fetch Garage
      const { data: garageData } = await supabase.from('garages').select('*').eq('profile_id', user.id).single();
      
      if (garageData) {
        setGarage(garageData);
        setFormData({
          name: garageData.name || '',
          address: garageData.address || '',
          city: garageData.city || '',
          zip_code: garageData.zip_code || '',
          phone_primary: garageData.phone_primary || '',
          email: user.email || '',
          hourly_rate: garageData.hourly_rate || ''
        });

        // Fetch Appointments
        const { data: items } = await supabase
          .from('order_items')
          .select('*, products(name, brand), orders(created_at, status, user_id, contact_name, contact_phone)')
          .eq('garage_id', garageData.id)
          .order('created_at', { ascending: false });
        
        setAppointments(items || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('garages').update({
      name: formData.name,
      address: formData.address,
      city: formData.city,
      zip_code: formData.zip_code,
      phone_primary: formData.phone_primary
    }).eq('id', garage.id);

    if (error) alert('Erreur lors de la sauvegarde: ' + error.message);
    else alert('Profil mis à jour !');
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F1F1F1]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-gray-800">Mon Garage</span>
          <span className="text-xs block text-gray-400 mt-1">Espace Partenaire</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <button onClick={() => setActiveTab('appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'appointments' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Calendar size={20} /> Rendez-vous
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <MapPin size={20} /> Profil Garage
          </button>
          <button onClick={() => setActiveTab('credits')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'credits' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <DollarSign size={20} /> Mes Crédits
          </button>
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'appointments' && (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Planning des Montages</h1>
              <p className="text-gray-500 text-sm">Gérez les commandes à livrer et monter dans votre garage.</p>
            </header>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {appointments.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                          <Wrench size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{apt.products?.name}</p>
                          {apt.orders?.contact_name && (
                             <p className="text-sm font-semibold text-gray-700 mt-1">Client: {apt.orders.contact_name} {apt.orders.contact_phone ? `(${apt.orders.contact_phone})` : ''}</p>
                          )}
                          <p className="text-sm text-gray-500">Qté: {apt.quantity} • {new Date(apt.created_at).toLocaleDateString()}</p>
                          <p className="text-xs text-blue-600 mt-1">Commande du {new Date(apt.orders?.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${apt.orders?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {apt.orders?.status === 'pending' ? 'En attente' : 'Confirmé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Aucun rendez-vous planifié pour le moment.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Mon Profil Garage</h1>
              <p className="text-gray-500 text-sm">Mettez à jour vos informations publiques.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nom du Garage</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                    <input type="text" value={formData.phone_primary} onChange={e => setFormData({...formData, phone_primary: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Adresse</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ville</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Code Postal</label>
                    <input type="text" value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  Sauvegarder les modifications
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'credits' && (
           <>
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Mes Crédits</h1>
              <p className="text-gray-500 text-sm">Historique de vos gains d'installation.</p>
            </header>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
               <p className="text-gray-500 mb-2">Total accumulé</p>
               <p className="text-4xl font-bold text-green-600">€0.00</p>
               <p className="text-xs text-gray-400 mt-4">Le système de calcul de commission est en cours de configuration.</p>
            </div>
           </>
        )}
      </main>
    </div>
  );
}
