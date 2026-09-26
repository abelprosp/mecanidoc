"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function OverviewSection() {
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, clientsCount: 0, pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: orders } = await supabase.from('orders').select('total_amount');
        const revenue = orders?.reduce((acc: number, order: any) => acc + (Number(order.total_amount) || 0), 0) || 0;
        const ordersCount = orders?.length || 0;
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
          ordersCount,
          clientsCount: clientsCount || 0,
          pendingApprovals:
            (pendingGarages || 0) + (pendingSuppliers || 0) + (pendingSupplierPromotions || 0),
        });
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
