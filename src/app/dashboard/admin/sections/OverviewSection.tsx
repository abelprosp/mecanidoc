"use client";

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, CreditCard, DollarSign, Package, PlugZap, ShoppingBag, Users, MessageSquare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AdminButton, AdminLoading, AdminPageHeader, AdminStat } from '@/components/admin/ui';

const SHORTCUTS = [
  { tab: 'products', label: 'Produits', icon: Package, hint: 'Stock et fiches' },
  { tab: 'approvals', label: 'Approbations', icon: CheckCircle, hint: 'Garages et fournisseurs' },
  { tab: 'sales', label: 'Ventes', icon: ShoppingBag, hint: 'Commandes payées', href: '/dashboard/admin/sales' },
  { tab: 'supplier-connections', label: 'Fournisseurs', icon: PlugZap, hint: 'API et imports' },
  { tab: 'stripe', label: 'Stripe', icon: CreditCard, hint: 'Paiements' },
  { tab: 'support-chat', label: 'Support', icon: MessageSquare, hint: 'Chat en direct' },
];

export default function OverviewSection() {
  const router = useRouter();
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, clientsCount: 0, pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: orders } = await supabase.from('orders').select('total_amount, payment_status');
        const paid = (orders || []).filter((o: { payment_status?: string }) => o.payment_status === 'paid');
        const revenue = paid.reduce((acc: number, order: { total_amount?: number }) => acc + (Number(order.total_amount) || 0), 0);
        const { count: clientsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer');
        const { count: pendingGarages } = await supabase.from('garages').select('*', { count: 'exact', head: true }).eq('is_approved', false);
        const { count: pendingSuppliers } = await supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_approved', false);
        const { count: pendingSupplierPromotions } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .eq('supplier_promotion_pending', true);
        setStats({
          revenue,
          ordersCount: orders?.length || 0,
          clientsCount: clientsCount || 0,
          pendingApprovals: (pendingGarages || 0) + (pendingSuppliers || 0) + (pendingSupplierPromotions || 0),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <AdminLoading />;

  return (
    <>
      <AdminPageHeader
        title="Tableau de bord"
        description="Pilotage du catalogue, des commandes et des partenaires."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <AdminStat label="Revenu encaissé" value={`€${stats.revenue.toFixed(2)}`} icon={<DollarSign size={18} />} tone="green" hint="Commandes payées" />
        <AdminStat label="Commandes" value={stats.ordersCount} icon={<ShoppingBag size={18} />} tone="blue" />
        <AdminStat label="Clients" value={stats.clientsCount} icon={<Users size={18} />} />
        <AdminStat
          label="À approuver"
          value={stats.pendingApprovals}
          icon={<CheckCircle size={18} />}
          tone={stats.pendingApprovals > 0 ? 'amber' : 'slate'}
        />
      </div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Accès rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.tab}
              type="button"
              onClick={() => router.push(s.href || `/dashboard/admin?tab=${s.tab}`)}
              className="admin-card p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all flex items-start gap-3"
            >
              <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                <Icon size={18} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{s.label}</span>
                <span className="block text-sm text-slate-500">{s.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {stats.pendingApprovals > 0 ? (
        <div className="mt-8 admin-card p-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60">
          <p className="text-sm text-amber-900">
            {stats.pendingApprovals} demande{stats.pendingApprovals > 1 ? 's' : ''} d’approbation en attente.
          </p>
          <AdminButton size="sm" onClick={() => router.push('/dashboard/admin?tab=approvals')}>
            Traiter
          </AdminButton>
        </div>
      ) : null}
    </>
  );
}
