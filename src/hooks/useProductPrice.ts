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
      const { data: taxes } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (taxes) {
        const calculatedPrice = calculateFinalPrice(basePrice, category, taxes);
        setFinalPrice(calculatedPrice);
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
      const { data } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data) {
        setTaxes(data);
      }
      setLoading(false);
    };

    fetchTaxes();
  }, []);

  return { taxes, loading };
}
