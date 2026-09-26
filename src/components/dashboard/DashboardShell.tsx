"use client";

import React, { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';

export type DashboardNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
  /** Se definido, o item é um link para outra página em vez de uma secção. */
  href?: string;
};

type Props = {
  title: string;
  subtitle?: ReactNode;
  items: DashboardNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onSignOut?: () => void;
  /** Conteúdo extra no fundo da barra lateral (por exemplo link para o site). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Layout partilhado dos painéis (garagem, empresa, admin…): barra lateral fixa em
 * desktop e gaveta deslizante em mobile, com botão de menu e overlay. Fecha ao
 * escolher uma secção, com Escape ou ao redimensionar para desktop.
 */
export default function DashboardShell({ title, subtitle, items, activeKey, onSelect, onSignOut, footer, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const select = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xl font-bold text-gray-800 block truncate">{title}</span>
          {subtitle ? <span className="text-xs block text-gray-400 mt-1 truncate">{subtitle}</span> : null}
        </div>
        <button type="button" onClick={() => setOpen(false)} className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-800" aria-label="Fermer le menu">
          <X size={20} aria-hidden />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Sections">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          if (item.href) {
            return (
              <Link key={item.key} href={item.href} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-600 hover:bg-gray-50">
                <Icon size={20} aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => select(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon size={20} aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge != null && item.badge !== 0 && item.badge !== '' ? (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{item.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t space-y-1">
        {footer}
        <Link href="/" className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
          ← Retour au site
        </Link>
        {onSignOut ? (
          <button type="button" onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} aria-hidden /> Déconnexion
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      {/* Desktop */}
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col shrink-0">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {open ? <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden /> : null}
      <aside
        className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu du tableau de bord"
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-lg" aria-label="Ouvrir le menu" aria-expanded={open}>
            <Menu size={22} aria-hidden />
          </button>
          <span className="font-bold text-gray-800 truncate">{items.find((i) => i.key === activeKey)?.label || title}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
