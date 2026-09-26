"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { calculateFinalPrice } from '@/lib/price-calculator';

export type TaxRow = {
  id?: string;
  name?: string;
  rate: number;
  is_percentage: boolean;
  applies_to: string;
  is_active: boolean;
  sort_order?: number;
};

function toPriceNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cache partilhada das taxas ativas: uma única consulta por página (TTL 5 min),
 * em vez de uma consulta por cartão de produto.
 */
const TAXES_TTL_MS = 5 * 60 * 1000;
let taxesCache: { at: number; rows: TaxRow[] } | null = null;
let taxesInflight: Promise<TaxRow[]> | null = null;

export function loadActiveTaxes(): Promise<TaxRow[]> {
  if (taxesCache && Date.now() - taxesCache.at < TAXES_TTL_MS) {
    return Promise.resolve(taxesCache.rows);
  }
  if (taxesInflight) return taxesInflight;
  taxesInflight = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const rows = (!error && Array.isArray(data) ? data : []) as TaxRow[];
      taxesCache = { at: Date.now(), rows };
      return rows;
    } catch {
      return taxesCache?.rows ?? [];
    } finally {
      taxesInflight = null;
    }
  })();
  return taxesInflight;
}

/** Invalida a cache (por exemplo após editar taxas no admin). */
export function invalidateTaxesCache() {
  taxesCache = null;
}

/**
 * Hook para calcular o preço final de um produto com todas as taxas aplicadas.
 */
export function useProductPrice(basePrice: number | string, category: string = 'Auto') {
  const numericBase = toPriceNumber(basePrice);
  const [taxes, setTaxes] = useState<TaxRow[] | null>(taxesCache?.rows ?? null);

  useEffect(() => {
    let cancelled = false;
    loadActiveTaxes().then((rows) => {
      if (!cancelled) setTaxes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const finalPrice = taxes ? calculateFinalPrice(numericBase, category, taxes) : numericBase;
  return { finalPrice, loading: taxes === null };
}

/**
 * Hook para buscar todas as taxas ativas.
 */
export function useTaxes() {
  const [taxes, setTaxes] = useState<TaxRow[]>(taxesCache?.rows ?? []);
  const [loading, setLoading] = useState(taxesCache === null);

  useEffect(() => {
    let cancelled = false;
    loadActiveTaxes().then((rows) => {
      if (cancelled) return;
      setTaxes(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { taxes, loading };
}
