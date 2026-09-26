"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import SecuritySettings from '@/components/account/SecuritySettings';

export default function ProfileSection() { 
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

      <h2 className="text-lg md:text-xl font-bold mt-8 mb-4 text-gray-800">Sécurité</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <SecuritySettings />
      </div>
    </div>
  );
}
