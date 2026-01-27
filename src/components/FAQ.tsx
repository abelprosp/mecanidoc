"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface FAQProps {
  pageSlug?: string; // 'home', 'moto', 'camion', 'tracteurs', ou slug de categoria
}

export default function FAQ({ pageSlug = 'home' }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchFAQs = async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('page_slug', pageSlug)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (data) {
        setFaqs(data);
      }
      setLoading(false);
    };

    fetchFAQs();
  }, [pageSlug]);

  if (loading) {
    return (
      <section className="py-4 md:py-6 bg-white">
        <div className="md:container md:mx-auto md:px-4">
          <h2 className="text-sm font-bold text-gray-500 mb-4 md:mb-6 uppercase tracking-wide">QUESTIONS FRÉQUENTES SUR LES PNEUS</h2>
          <div className="text-center text-gray-400 py-4 md:py-6">Chargement...</div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null; // Não exibe nada se não houver FAQs
  }

  return (
    <section className="py-4 md:py-6 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-bold text-gray-500 mb-4 md:mb-6 uppercase tracking-wide">QUESTIONS FRÉQUENTES SUR LES PNEUS</h2>
        
        <div className="space-y-2 md:space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="border-b border-gray-100 pb-3 md:pb-4">
              <button 
                className="w-full flex items-center gap-4 text-left py-2 focus:outline-none group"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {openIndex === index ? (
                  <Minus size={16} className="text-gray-800 flex-shrink-0" />
                ) : (
                  <Plus size={16} className="text-gray-800 flex-shrink-0" />
                )}
                <span className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                  {faq.question}
                </span>
              </button>
              
              {openIndex === index && (
                <div className="mt-2 pl-8 text-gray-500 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
