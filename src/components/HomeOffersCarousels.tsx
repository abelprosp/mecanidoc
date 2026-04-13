"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const CATEGORY_ORDER = ["Auto", "Moto", "Camion", "Tracteurs"] as const;
type ParentCategory = (typeof CATEGORY_ORDER)[number];

const BADGE_CLASS: Record<string, string> = {
  red: "bg-red-600 text-white",
  green: "bg-green-600 text-white",
  blue: "bg-blue-600 text-white",
  orange: "bg-orange-500 text-white",
};

const CARD_GRADIENTS = [
  "bg-gradient-to-br from-gray-900 to-gray-800",
  "bg-gradient-to-br from-blue-900 to-blue-800",
  "bg-gradient-to-br from-gray-800 to-black",
];

function normalizeParentCategory(raw: string | null | undefined): ParentCategory | null {
  const t = (raw || "").trim();
  if (!t) return null;
  const l = t.toLowerCase();
  if (l === "auto") return "Auto";
  if (l === "moto") return "Moto";
  if (l === "camion") return "Camion";
  if (l === "tracteur" || l === "tracteurs") return "Tracteurs";
  return null;
}

function isActiveByDate(p: { start_date?: string | null; end_date?: string | null }) {
  const now = new Date();
  if (p.start_date && new Date(p.start_date) > now) return false;
  if (p.end_date && new Date(p.end_date) < now) return false;
  return true;
}

type PromoRow = {
  id: string;
  title: string;
  discount_text?: string | null;
  description?: string | null;
  link_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number | null;
  parent_category?: string | null;
  badge_text?: string | null;
  badge_color?: string | null;
};

function OfferCard({ p, index }: { p: PromoRow; index: number }) {
  const badgeLabel = (p.badge_text || p.discount_text || "OFFRE").trim() || "OFFRE";
  const badgeKey = (p.badge_color || "red").toLowerCase();
  const badgeCls = BADGE_CLASS[badgeKey] || BADGE_CLASS.red;
  const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  const inner = (
    <div
      className={`${grad} rounded-2xl p-5 min-h-[140px] flex flex-col justify-end shadow-md border border-white/10 transition-transform hover:scale-[1.02] focus-within:ring-2 focus-within:ring-blue-400/60`}
    >
      <span className={`text-xs font-bold px-2 py-1 rounded w-fit mb-2 ${badgeCls}`}>{badgeLabel}</span>
      <h3 className="font-bold text-lg text-white leading-snug line-clamp-2">{p.title}</h3>
      {p.description ? (
        <p className="text-sm text-white/85 mt-1 line-clamp-2">{p.description}</p>
      ) : null}
    </div>
  );

  if (p.link_url?.trim()) {
    const href = p.link_url.trim();
    if (/^https?:\/\//i.test(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block min-w-[min(100%,280px)] md:min-w-[300px] snap-center shrink-0"
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className="block min-w-[min(100%,280px)] md:min-w-[300px] snap-center shrink-0">
        {inner}
      </Link>
    );
  }

  return <div className="min-w-[min(100%,280px)] md:min-w-[300px] snap-center shrink-0">{inner}</div>;
}

function OffersCarouselRow({ category, items }: { category: ParentCategory; items: PromoRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <section className="py-3 md:py-5 bg-transparent relative group">
      <div className="layout-container">
        <h2 className="text-sm font-bold text-gray-900 mb-3 md:mb-4 uppercase tracking-wide">
          Offres — {category}
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-[-12px] top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 p-2.5 rounded-full text-gray-600 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler vers la gauche"
          >
            <ChevronLeft size={22} />
          </button>
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-3 md:gap-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          >
            {items.map((p, idx) => (
              <OfferCard key={p.id} p={p} index={idx} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-[-12px] top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 p-2.5 rounded-full text-gray-600 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler vers la droite"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}

interface HomeOffersCarouselsProps {
  /** Si défini (ex. page catégorie), un seul carrousel pour cette catégorie mère. */
  categoryFilter?: string | null;
}

export default function HomeOffersCarousels({ categoryFilter }: HomeOffersCarouselsProps) {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("promotions")
        .select(
          "id, title, discount_text, description, link_url, start_date, end_date, sort_order, parent_category, badge_text, badge_color"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("promotions carrousel:", error);
        setRows([]);
        setLoading(false);
        return;
      }
      const list = (data || []) as PromoRow[];
      const active = list.filter(isActiveByDate);
      setRows(active);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    const withParent = rows.filter((p) => normalizeParentCategory(p.parent_category));
    const filterUi = categoryFilter ? normalizeParentCategory(categoryFilter) : null;

    const buckets: Record<ParentCategory, PromoRow[]> = {
      Auto: [],
      Moto: [],
      Camion: [],
      Tracteurs: [],
    };

    for (const p of withParent) {
      const c = normalizeParentCategory(p.parent_category);
      if (!c) continue;
      if (filterUi && c !== filterUi) continue;
      buckets[c].push(p);
    }

    const out: { category: ParentCategory; items: PromoRow[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      if (filterUi && cat !== filterUi) continue;
      const items = buckets[cat];
      if (items.length > 0) out.push({ category: cat, items });
    }
    return out;
  }, [rows, categoryFilter]);

  if (loading) {
    return (
      <div className="layout-container py-6 flex justify-center">
        <Loader2 className="animate-spin text-gray-400" aria-hidden />
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map(({ category, items }) => (
        <OffersCarouselRow key={category} category={category} items={items} />
      ))}
    </>
  );
}
