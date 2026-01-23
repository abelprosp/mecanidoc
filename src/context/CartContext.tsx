"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { calculateFinalPrice } from '@/lib/price-calculator';

type CartItem = {
  product: any;
  quantity: number;
  garage: any;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: any, quantity: number, garage: any) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const supabase = createClient();

  // Load taxes
  useEffect(() => {
    const fetchTaxes = async () => {
      const { data } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data) setTaxes(data);
    };
    fetchTaxes();
  }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('mecanidoc_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mecanidoc_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any, quantity: number, garage: any) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity, garage: garage || item.garage }
            : item
        );
      }
      return [...prev, { product, quantity, garage }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = items.reduce((acc, item) => {
    const finalPrice = calculateFinalPrice(
      item.product.base_price || 0,
      item.product.category || 'Auto',
      taxes
    );
    return acc + (finalPrice * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
