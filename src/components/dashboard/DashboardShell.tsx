"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LogOut, Menu, Search, X, type LucideIcon } from 'lucide-react';

export type DashboardNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
  href?: string;
};

export type DashboardNavGroup = {
  id: string;
  label: string;
  items: DashboardNavItem[];
};

type Props = {
  title: string;
  subtitle?: ReactNode;
  items?: DashboardNavItem[];
  groups?: DashboardNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  onSignOut?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'admin';
};

export default function DashboardShell({
  title,
  subtitle,
  items,
  groups,
  activeKey,
  onSelect,
  onSignOut,
  footer,
  children,
  variant = 'default',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const admin = variant === 'admin';

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

  const allGroups: DashboardNavGroup[] = useMemo(() => {
    if (groups?.length) return groups;
    return [{ id: 'main', label: '', items: items || [] }];
  }, [groups, items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [allGroups, query]);

  const activeLabel = allGroups.flatMap((g) => g.items).find((i) => i.key === activeKey)?.label || title;

  const navItemClass = (active: boolean) => {
    if (admin) {
      return `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`;
    }
    return `w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
    }`;
  };

  const sidebarContent = (
    <>
      <div className={`p-5 border-b flex items-start justify-between gap-3 ${admin ? 'border-white/10' : ''}`}>
        <div className="min-w-0">
          <span className={`text-lg font-semibold tracking-tight block truncate ${admin ? 'text-white' : 'text-gray-800'}`}>
            {title}
          </span>
          {subtitle ? (
            <span className={`text-[11px] font-semibold uppercase tracking-wider block mt-1 truncate ${admin ? 'text-slate-400' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`md:hidden p-2 -mr-2 rounded-lg ${admin ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-800'}`}
          aria-label="Fermer le menu"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {admin ? (
        <div className="px-3 pt-3">
          <label className="relative block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg border-0 bg-white/10 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Sections">
        {filtered.map((group) => (
          <div key={group.id}>
            {group.label ? (
              <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${admin ? 'text-slate-500' : 'text-gray-400'}`}>
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeKey || (item.href ? item.href.includes(activeKey) : false);
                if (item.href) {
                  return (
                    <Link key={item.key} href={item.href} className={navItemClass(active)}>
                      <Icon size={18} aria-hidden />
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
                    className={`${navItemClass(active)} text-left`}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge !== 0 && item.badge !== '' ? (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className={`px-3 text-sm ${admin ? 'text-slate-500' : 'text-gray-400'}`}>Aucun résultat</p>
        ) : null}
      </nav>

      <div className={`p-3 border-t space-y-1 ${admin ? 'border-white/10' : ''}`}>
        {footer}
        <Link
          href="/"
          className={admin ? 'w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg' : 'w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg'}
        >
          ← Retour au site
        </Link>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className={admin ? 'w-full flex items-center gap-3 px-3 py-2.5 text-rose-300 hover:bg-rose-500/15 rounded-lg text-sm' : 'w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg'}
          >
            <LogOut size={18} aria-hidden /> Déconnexion
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={`flex h-screen ${admin ? 'admin-ui bg-slate-100' : 'bg-[#F1F1F1]'}`}>
      <aside className={`hidden md:flex flex-col shrink-0 ${admin ? 'w-72 bg-slate-950' : 'w-64 bg-white shadow-lg'}`}>
        {sidebarContent}
      </aside>

      {open ? <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} aria-hidden /> : null}
      <aside
        className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          admin ? 'bg-slate-950' : 'bg-white shadow-xl'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu du tableau de bord"
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`sticky top-0 z-30 border-b px-4 py-3 flex items-center gap-3 md:hidden ${admin ? 'bg-white/90 backdrop-blur border-slate-200' : 'bg-white'}`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
          >
            <Menu size={22} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden md:block">{title}</p>
            <p className="font-semibold text-slate-900 truncate">{activeLabel}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
