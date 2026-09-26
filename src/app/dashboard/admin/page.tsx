"use client";

import React, { useState } from 'react';
import {
  LayoutDashboard, Package, Tag, CreditCard, Settings, Truck, FileText, CheckCircle,
  Percent, DollarSign, Globe, User, Grid, Layout, List, MessageSquare, Inbox, PlugZap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardShell, { type DashboardNavItem } from '@/components/dashboard/DashboardShell';
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

const MENU_ITEMS: DashboardNavItem[] = [
  { key: 'overview', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { key: 'products', icon: Package, label: 'Gestion Produits' },
  { key: 'brands', icon: Grid, label: 'Marques' },
  { key: 'pages', icon: Layout, label: 'Pages Catégories' },
  { key: 'subcategories', icon: List, label: 'Sous-catégories Menu' },
  { key: 'footer', icon: Globe, label: 'Pied de page' },
  { key: 'promotions', icon: Tag, label: 'Promotions' },
  { key: 'faqs', icon: FileText, label: 'FAQs' },
  { key: 'taxes', icon: Percent, label: 'Taxes' },
  { key: 'settings', icon: Settings, label: 'Configuration Globale' },
  { key: 'supplier-connections', icon: PlugZap, label: 'Connexions fournisseurs' },
  { key: 'neumaticos-andres', icon: Truck, label: 'Neumáticos Andrés' },
  { key: 'stripe', icon: CreditCard, label: 'Paiement Stripe' },
  { key: 'approvals', icon: CheckCircle, label: 'Approbations' },
  { key: 'support-chat', icon: MessageSquare, label: 'Support Chat' },
  { key: 'support-inbox', icon: Inbox, label: 'Inbox Email' },
  { key: 'sales', icon: DollarSign, label: 'Ventes', href: '/dashboard/admin/sales' },
  { key: 'profile', icon: User, label: 'Mon Profil' },
];

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  const Section = SECTIONS[activeTab] ?? OverviewSection;

  return (
    <DashboardShell title="MecaniDoc" subtitle="MASTER ADMIN" items={MENU_ITEMS} activeKey={activeTab} onSelect={setActiveTab} onSignOut={handleSignOut}>
      <Section />
    </DashboardShell>
  );
}
