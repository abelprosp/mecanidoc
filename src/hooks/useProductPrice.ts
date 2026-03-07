"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { calculateFinalPrice } from '@/lib/price-calculator';

/**
 * Hook para calcular o preço final de um produto com todas as taxas aplicadas
 */
export function useProductPrice(basePrice: number, category: string = 'Auto') {
  const [finalPrice, setFinalPrice] = useState(basePrice);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTaxesAndCalculate = async () => {
      try {
        const { data: taxes, error } = await supabase
          .from('taxes')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && taxes?.length) {
          const calculatedPrice = calculateFinalPrice(basePrice, category, taxes);
          setFinalPrice(calculatedPrice);
        }
      } catch {
        // Tabela taxes pode não existir ainda
      }
      setLoading(false);
    };

    fetchTaxesAndCalculate();
  }, [basePrice, category]);

  return { finalPrice, loading };
}

/**
 * Hook para buscar todas as taxas ativas
 */
export function useTaxes() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const { data, error } = await supabase
          .from('taxes')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) setTaxes(data);
      } catch {
        setTaxes([]);
      }
      setLoading(false);
    };

    fetchTaxes();
  }, []);

  return { taxes, loading };
}
