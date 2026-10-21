"use client";

import React, { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { AdminLoading } from '@/components/admin/ui';
import { ADMIN_NAV_GROUPS } from './nav';
import SubcategoriesSectionComponent from './SubcategoriesSection';
import PromotionsSection from './PromotionsSection';
import SupportChatSection from './SupportChatSection';
import SupportInboxSection from './SupportInboxSection';
import NeumaticosAndresSection from './NeumaticosAndresSection';
import SupplierConnectionsSection from './SupplierConnectionsSection';
import StripeSection from './StripeSection';
import OverviewSection from './sections/OverviewSection';
import ProductsSection from './sections/ProductsSection';
import PagesSection from './sections/PagesSection';
import BrandsSection from './sections/BrandsSection';
import SettingsSection from './sections/SettingsSection';
import FooterSection from './sections/FooterSection';
import ApprovalsSection from './sections/ApprovalsSection';
import ProfileSection from './sections/ProfileSection';
import FAQsSection from './sections/FAQsSection';
import TaxesSection from './sections/TaxesSection';

const SECTIONS: Record<string, React.ComponentType> = {
  overview: OverviewSection,
  products: ProductsSection,
  brands: BrandsSection,
  pages: PagesSection,
  footer: FooterSection,
  faqs: FAQsSection,
  taxes: TaxesSection,
  subcategories: SubcategoriesSectionComponent,
  promotions: PromotionsSection,
  settings: SettingsSection,
  'supplier-connections': SupplierConnectionsSection,
  'neumaticos-andres': NeumaticosAndresSection,
  stripe: StripeSection,
  approvals: ApprovalsSection,
  'support-chat': SupportChatSection,
  'support-inbox': SupportInboxSection,
  profile: ProfileSection,
};

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setTab = useCallback(
    (key: string) => {
      const next = key === 'overview' ? '/dashboard/admin' : `/dashboard/admin?tab=${encodeURIComponent(key)}`;
      router.replace(next, { scroll: false });
    },
    [router]
  );

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  const Section = SECTIONS[activeTab] ?? OverviewSection;

  return (
    <DashboardShell
      variant="admin"
      title="MecaniDoc"
      subtitle="Administration"
      groups={ADMIN_NAV_GROUPS}
      activeKey={activeTab}
      onSelect={setTab}
      onSignOut={handleSignOut}
    >
      <Section />
    </DashboardShell>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboardInner />
    </Suspense>
  );
}
