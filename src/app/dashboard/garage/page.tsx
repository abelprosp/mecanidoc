"use client";

import React, { useEffect, useState } from 'react';
import { MapPin, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import GarageAgenda from './GarageAgenda';

export default function GarageDashboard() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [garage, setGarage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
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
    hourly_rate: '',
    slot_minutes: '60',
    daily_capacity: '8',
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
          hourly_rate: garageData.hourly_rate || '',
          slot_minutes: String(garageData.slot_minutes || 60),
          daily_capacity: String(garageData.daily_capacity || 8),
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    const payload: Record<string, unknown> = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      zip_code: formData.zip_code,
      phone_primary: formData.phone_primary,
    };
    const slot = Number.parseInt(formData.slot_minutes, 10);
    const cap = Number.parseInt(formData.daily_capacity, 10);
    if (Number.isInteger(slot) && slot >= 15) payload.slot_minutes = slot;
    if (Number.isInteger(cap) && cap >= 1) payload.daily_capacity = cap;
    const { error } = await supabase.from('garages').update(payload).eq('id', garage.id);

    if (error) setSaveError(error.message);
    else setSaveOk(true);
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F1F1F1]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <DashboardShell
      title="Mon Garage"
      subtitle="Espace Partenaire"
      items={[
        { key: 'appointments', label: 'Rendez-vous', icon: Calendar },
        { key: 'profile', label: 'Profil Garage', icon: MapPin },
        { key: 'credits', label: 'Mes Crédits', icon: DollarSign },
      ]}
      activeKey={activeTab}
      onSelect={setActiveTab}
      onSignOut={handleSignOut}
    >
        {activeTab === 'appointments' && <GarageAgenda />}

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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Durée d&apos;un créneau (min)</label>
                    <input type="number" min={15} max={240} value={formData.slot_minutes} onChange={e => setFormData({...formData, slot_minutes: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Capacité par jour</label>
                    <input type="number" min={1} max={40} value={formData.daily_capacity} onChange={e => setFormData({...formData, daily_capacity: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                  </div>
                </div>
                {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
                {saveOk ? <p className="text-sm text-green-700">Profil mis à jour.</p> : null}
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
    </DashboardShell>
  );
}
