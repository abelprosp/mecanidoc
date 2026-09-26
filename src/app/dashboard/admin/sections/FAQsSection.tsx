"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function FAQsSection() {
  const supabase = createClient();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('home');

  const pageOptions = [
    { value: 'home', label: 'Home (Auto)' },
    { value: 'moto', label: 'Moto' },
    { value: 'camion', label: 'Camion' },
    { value: 'tracteurs', label: 'Tracteurs' }
  ];

  const fetchFAQs = async (pageSlug?: string) => {
    setLoading(true);
    const query = supabase.from('faqs').select('*');
    if (pageSlug) {
      query.eq('page_slug', pageSlug);
    }
    const { data } = await query.order('sort_order', { ascending: true });
    setFaqs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFAQs(selectedPage);
  }, [selectedPage]);

  const handleSave = async (e: React.FormEvent, faqData: any) => {
    e.preventDefault();
    if (faqData.id) {
      await supabase.from('faqs').update(faqData).eq('id', faqData.id);
    } else {
      await supabase.from('faqs').insert([faqData]);
    }
    setEditingFAQ(null);
    setIsAdding(false);
    fetchFAQs(selectedPage);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return;
    await supabase.from('faqs').delete().eq('id', id);
    fetchFAQs(selectedPage);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion des FAQs</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {pageOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingFAQ({ page_slug: selectedPage, question: '', answer: '', sort_order: (faqs.length + 1) * 10, is_active: true });
            }}
            className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base w-full sm:w-auto"
          >
            + Nouvelle FAQ
          </button>
        </div>
      </header>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {faqs.map((faq) => (
          <div key={faq.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-bold text-gray-800 text-sm mb-1">{faq.question}</p>
                <p className="text-gray-500 text-xs line-clamp-2">{faq.answer}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFAQ(faq)}
                  className="text-blue-600 p-1.5"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="text-red-600 p-1.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {faqs.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Aucune FAQ pour cette page
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Question</th>
              <th className="px-6 py-4">Réponse</th>
              <th className="px-6 py-4">Ordre</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {faqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{faq.question}</td>
                <td className="px-6 py-4 text-gray-600 max-w-md truncate">{faq.answer}</td>
                <td className="px-6 py-4 text-gray-500">{faq.sort_order}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingFAQ(faq)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Modifier"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {faqs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Aucune FAQ pour cette page
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editingFAQ || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingFAQ?.id ? 'Modifier' : 'Ajouter'} une FAQ</h3>
              <button
                onClick={() => {
                  setEditingFAQ(null);
                  setIsAdding(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                handleSave(e, {
                  ...editingFAQ,
                  ...data,
                  sort_order: parseInt(data.sort_order as string) || 0,
                  is_active: data.is_active === 'true' || data.is_active === 'on'
                });
              }}
              className="p-4 md:p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Page</label>
                <select
                  name="page_slug"
                  defaultValue={editingFAQ?.page_slug || selectedPage}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  {pageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Question</label>
                <input
                  name="question"
                  type="text"
                  defaultValue={editingFAQ?.question || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Réponse</label>
                <textarea
                  name="answer"
                  defaultValue={editingFAQ?.answer || ''}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ordre</label>
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={editingFAQ?.sort_order || 0}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Statut</label>
                  <select
                    name="is_active"
                    defaultValue={editingFAQ?.is_active ? 'true' : 'false'}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFAQ(null);
                    setIsAdding(false);
                  }}
                  className="px-4 py-2 border rounded font-medium order-2 sm:order-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-bold order-1 sm:order-2"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
