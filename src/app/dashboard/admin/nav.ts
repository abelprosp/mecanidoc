import {
  LayoutDashboard, Package, Tag, CreditCard, Settings, Truck, FileText, CheckCircle,
  Percent, DollarSign, Globe, User, Grid, Layout, List, MessageSquare, Inbox, PlugZap,
} from 'lucide-react';
import type { DashboardNavGroup } from '@/components/dashboard/DashboardShell';

export const ADMIN_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    items: [
      { key: 'overview', icon: LayoutDashboard, label: "Vue d'ensemble" },
      { key: 'sales', icon: DollarSign, label: 'Ventes', href: '/dashboard/admin/sales' },
      { key: 'approvals', icon: CheckCircle, label: 'Approbations' },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    items: [
      { key: 'products', icon: Package, label: 'Produits' },
      { key: 'brands', icon: Grid, label: 'Marques' },
      { key: 'promotions', icon: Tag, label: 'Promotions' },
      { key: 'taxes', icon: Percent, label: 'Taxes' },
    ],
  },
  {
    id: 'contenu',
    label: 'Contenu',
    items: [
      { key: 'pages', icon: Layout, label: 'Pages catégories' },
      { key: 'subcategories', icon: List, label: 'Menu' },
      { key: 'footer', icon: Globe, label: 'Pied de page' },
      { key: 'faqs', icon: FileText, label: 'FAQs' },
    ],
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    items: [
      { key: 'supplier-connections', icon: PlugZap, label: 'Fournisseurs' },
      { key: 'neumaticos-andres', icon: Truck, label: 'Neumáticos Andrés' },
      { key: 'stripe', icon: CreditCard, label: 'Stripe' },
      { key: 'settings', icon: Settings, label: 'Configuration' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { key: 'support-chat', icon: MessageSquare, label: 'Chat' },
      { key: 'support-inbox', icon: Inbox, label: 'Inbox e-mail' },
    ],
  },
  {
    id: 'compte',
    label: 'Compte',
    items: [
      { key: 'profile', icon: User, label: 'Mon profil' },
    ],
  },
];
