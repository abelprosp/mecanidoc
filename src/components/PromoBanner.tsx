"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Tag } from 'lucide-react';

export default function PromoBanner() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchPromotions = async () => {
      const { data } = await supabase
        .from('promotions')
        .select('id, title, discount_text, description, link_url, start_date, end_date')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(10);
      const list = data || [];
      const now = new Date();
      const active = list.filter((p) => {
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        return true;
      });
      setPromotions(active.slice(0, 5));
    };
    fetchPromotions();
  }, []);

  if (promotions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm font-medium">
          {promotions.map((p) => {
            const content = (
              <span className="inline-flex items-center gap-2">
                <Tag size={16} className="flex-shrink-0" />
                {p.discount_text && (
                  <span className="font-bold">{p.discount_text}</span>
                )}
                {p.title}
                {p.description && (
                  <span className="opacity-90 hidden sm:inline"> — {p.description}</span>
                )}
              </span>
            );
            if (p.link_url) {
              return (
                <Link
                  key={p.id}
                  href={p.link_url}
                  className="hover:underline focus:outline-none focus:underline"
                >
                  {content}
                </Link>
              );
            }
            return <div key={p.id}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
