"use client";

import React, { Fragment, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Download, DollarSign, Package, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import OrderPurchaseDetails from '@/components/OrderPurchaseDetails';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { AdminBadge, AdminButton, AdminLoading, AdminPageHeader, AdminStat } from '@/components/admin/ui';
import { ADMIN_NAV_GROUPS } from '../nav';

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [masterReady, setMasterReady] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role !== 'master') {
        router.push('/dashboard/admin');
        return;
      }
      setMasterReady(true);
    })();
  }, [router, supabase]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      }
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/sales?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setSales(data.orders || []);
        setStatistics(data.statistics || null);
      } else {
        console.error('Error fetching sales:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!masterReady) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarregar quando filtros mudam
  }, [masterReady, filters]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Payé',
      pending: 'En attente',
      failed: 'Échoué',
      canceled: 'Annulé',
      refunded: 'Remboursé',
      partially_refunded: 'Remb. partiel',
    };

    const tone = status === 'paid' ? 'green' : status === 'failed' ? 'red' : status === 'pending' ? 'amber' : 'slate';
    return <AdminBadge tone={tone}>{labels[status] || status}</AdminBadge>;
  };

  const shell = (children: React.ReactNode) => (
    <DashboardShell
      variant="admin"
      title="MecaniDoc"
      subtitle="Administration"
      groups={ADMIN_NAV_GROUPS}
      activeKey="sales"
      onSelect={(key) => router.push(key === 'overview' ? '/dashboard/admin' : `/dashboard/admin?tab=${key}`)}
      onSignOut={async () => {
        await supabase.auth.signOut();
        router.push('/auth/login');
      }}
    >
      {children}
    </DashboardShell>
  );

  if (loading && !sales.length) {
    return shell(<AdminLoading />);
  }

  return shell(
    <div className="space-y-6">
      <AdminPageHeader
        title="Ventes"
        description="Commandes, paiements et détail d’achat."
        actions={
          <AdminButton onClick={fetchSales}>
            <Download size={16} /> Actualiser
          </AdminButton>
        }
      />

      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <AdminStat label="Chiffre d'affaires" value={`€${statistics.totalSales.toFixed(2)}`} icon={<DollarSign size={18} />} tone="green" />
          <AdminStat label="Commandes" value={statistics.totalOrders} icon={<Package size={18} />} tone="blue" />
          <AdminStat label="Payées" value={statistics.paidOrders} icon={<CheckCircle size={18} />} tone="green" />
          <AdminStat label="En attente" value={statistics.pendingOrders} icon={<Clock size={18} />} tone="amber" />
        </div>
      )}

      {/* Filters */}
      <div className="admin-card p-4 md:p-5">
        <p className="text-sm text-gray-600 mb-3">
          Pour filtrer par période, indiquez <strong>les deux dates</strong> (début et fin). Une seule date
          laissée vide = toutes les commandes sont affichées. Le statut « Tous » n’applique aucun filtre
          de paiement.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Tous</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
              <option value="refunded">Remboursé</option>
            </select>
          </div>
          <button
            onClick={() => setFilters({ startDate: '', endDate: '', status: '' })}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Articles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <Fragment key={sale.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{sale.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sale.contact_name || sale.profiles?.full_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{sale.contact_email || sale.profiles?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">€{parseFloat(sale.total_amount.toString()).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sale.payment_status || sale.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.order_items?.length || 0} article(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        aria-expanded={expandedId === sale.id}
                        title="Détails de la commande"
                      >
                        {expandedId === sale.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === sale.id && (
                    <tr>
                      <td colSpan={7} className="p-0 border-t border-gray-100">
                        <OrderPurchaseDetails order={sale} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {sales.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune vente trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
