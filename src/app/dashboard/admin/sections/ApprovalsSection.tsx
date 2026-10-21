"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { AdminEmpty, AdminLoading, AdminPageHeader } from '@/components/admin/ui';

export default function ApprovalsSection() { 
  const supabase = createClient();
  const [garages, setGarages] = useState<any[]>([]);
  const [pendingCustomers, setPendingCustomers] = useState<any[]>([]);
  const [pendingSuppliers, setPendingSuppliers] = useState<any[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [gRes, pRes, sRes] = await Promise.all([
      supabase.from('garages').select('*').eq('is_approved', false).order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('role', 'customer')
        .eq('supplier_promotion_pending', true)
        .order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('is_approved', false).order('created_at', { ascending: false }),
    ]);
    setGarages(gRes.data || []);
    const profiles = pRes.data || [];
    setPendingCustomers(profiles);
    const names: Record<string, string> = {};
    profiles.forEach((row: any) => {
      names[row.id] = row.full_name || row.email?.split('@')[0] || 'Fournisseur';
    });
    setCompanyNames(names);
    setPendingSuppliers(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleApproveGarage = async (id: string) => {
    await supabase.from('garages').update({ is_approved: true }).eq('id', id);
    setGarages(garages.filter(g => g.id !== id));
  };

  const handleRejectGarage = async (id: string) => {
    if(!confirm('Rejeter cette demande ?')) return;
    await supabase.from('garages').delete().eq('id', id);
    setGarages(garages.filter(g => g.id !== id));
  };

  const handlePromoteToSupplier = async (profileId: string) => {
    const companyName = (companyNames[profileId] || '').trim();
    if (!companyName) {
      alert('Indiquez un nom de société (raison sociale) pour ce fournisseur.');
      return;
    }
    const { data: existing } = await supabase.from('suppliers').select('id').eq('profile_id', profileId).maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from('suppliers').insert({
        profile_id: profileId,
        company_name: companyName,
        is_approved: true,
      });
      if (insErr) {
        alert(insErr.message);
        return;
      }
    } else {
      await supabase.from('suppliers').update({ is_approved: true, company_name: companyName }).eq('profile_id', profileId);
    }
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ role: 'supplier', supplier_promotion_pending: false })
      .eq('id', profileId);
    if (upErr) {
      alert(upErr.message);
      return;
    }
    setPendingCustomers(pendingCustomers.filter(p => p.id !== profileId));
  };

  const handleDismissCustomerPromotion = async (profileId: string) => {
    if (!confirm('Retirer ce compte de la file ? Il restera client.')) return;
    await supabase.from('profiles').update({ supplier_promotion_pending: false }).eq('id', profileId);
    setPendingCustomers(pendingCustomers.filter(p => p.id !== profileId));
  };

  const handleApproveSupplierRow = async (id: string) => {
    await supabase.from('suppliers').update({ is_approved: true }).eq('id', id);
    setPendingSuppliers(pendingSuppliers.filter(s => s.id !== id));
  };

  const handleRejectSupplierRow = async (id: string) => {
    if (!confirm('Supprimer ce profil fournisseur non approuvé ?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    setPendingSuppliers(pendingSuppliers.filter(s => s.id !== id));
  };

  if (loading) return <AdminLoading />;

  const totalPending =
    pendingCustomers.length + garages.length + pendingSuppliers.length;

  if (totalPending === 0) {
    return (
      <div>
        <AdminPageHeader title="Approbations" description="Garages, fournisseurs et promotions de compte." />
        <AdminEmpty title="Aucune approbation en attente" hint="Les nouvelles demandes apparaîtront ici." icon={<CheckCircle size={22} />} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AdminPageHeader title="Approbations" description="Validez les partenaires avant qu’ils n’apparaissent en boutique." />

      {/* Comptes clients → fournisseur */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          Comptes clients (promotion fournisseur)
          {pendingCustomers.length > 0 && (
            <span className="text-sm font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{pendingCustomers.length}</span>
          )}
        </h2>
        {pendingCustomers.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun nouveau compte client en file.</p>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {pendingCustomers.map((row) => (
              <div key={row.id} className="admin-card p-4 md:p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800">{row.full_name || 'Sans nom'}</h3>
                    <p className="text-gray-500 text-sm">{row.email}</p>
                    <p className="text-gray-400 text-xs mt-1">Inscrit le {new Date(row.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Raison sociale (fournisseur)</label>
                    <input
                      type="text"
                      value={companyNames[row.id] ?? ''}
                      onChange={(e) => setCompanyNames((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Ex. Pneus Dupont SARL"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePromoteToSupplier(row.id)}
                      className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
                    >
                      Transformer en fournisseur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissCustomerPromotion(row.id)}
                      className="bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Retirer de la file
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Garages */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          Garages partenaires
          {garages.length > 0 && (
            <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{garages.length}</span>
          )}
        </h2>
        {garages.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune demande garage en attente.</p>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {garages.map((garage) => (
              <div key={garage.id} className="admin-card p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{garage.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{garage.address}, {garage.city} {garage.zip_code}</p>
                    <p className="text-gray-500 text-sm">{garage.phone_primary}</p>
                    <p className="text-gray-400 text-xs mt-2">Demandé le: {new Date(garage.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleApproveGarage(garage.id)} className="flex-1 md:flex-none bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm">
                      Approuver
                    </button>
                    <button onClick={() => handleRejectGarage(garage.id)} className="flex-1 md:flex-none bg-red-100 text-red-600 font-bold py-2 px-4 rounded hover:bg-red-200 transition-colors text-sm">
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fournisseurs (ligne suppliers non approuvée) */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          Profils fournisseur (validation)
          {pendingSuppliers.length > 0 && (
            <span className="text-sm font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">{pendingSuppliers.length}</span>
          )}
        </h2>
        {pendingSuppliers.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun fournisseur en attente de validation.</p>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {pendingSuppliers.map((s) => (
              <div key={s.id} className="admin-card p-4 md:p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-800">{s.company_name}</h3>
                  <p className="text-gray-400 text-xs mt-1">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleApproveSupplierRow(s.id)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm">
                    Approuver
                  </button>
                  <button type="button" onClick={() => handleRejectSupplierRow(s.id)} className="bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-red-200 text-sm">
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
