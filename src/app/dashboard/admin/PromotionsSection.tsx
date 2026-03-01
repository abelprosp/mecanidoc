"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2, Tag, Trash2, Plus } from 'lucide-react';

export default function PromotionsSection() {
  const supabase = createClient();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data } = await supabase.from('promotions').select('*').order('sort_order', { ascending: true });
    setPromotions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload = {
      title: formData.get('title') as string,
      discount_text: formData.get('discount_text') as string || null,
      description: formData.get('description') as string || null,
      link_url: formData.get('link_url') as string || null,
      is_active: formData.get('is_active') === 'on',
      start_date: (formData.get('start_date') as string) || null,
      end_date: (formData.get('end_date') as string) || null,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
      updated_at: new Date().toISOString(),
    };
    if (editing?.id) {
      await supabase.from('promotions').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('promotions').insert([payload]);
    }
    setEditing(null);
    setIsAdding(false);
    fetchPromotions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette promotion ?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromotions();
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Promoções / Publicidade</h1>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditing({
              title: '',
              discount_text: '20%',
              description: '',
              link_url: '',
              is_active: true,
              sort_order: promotions.length,
            });
          }}
          className="bg-[#0066CC] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nova promoção
        </button>
      </header>

      <p className="text-gray-600 text-sm mb-6">
        As promoções ativas aparecem automaticamente no site (ex: barra com &quot;20% de desconto&quot;).
      </p>

      <div className="space-y-4">
        {promotions.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Tag className="text-amber-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-800 truncate">{p.title}</p>
                <p className="text-sm text-gray-500">
                  {p.discount_text && <span className="text-green-600 font-medium">{p.discount_text}</span>}
                  {p.discount_text && p.description && ' · '}
                  {p.description && <span className="truncate block">{p.description}</span>}
                </p>
              </div>
              {!p.is_active && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inativa</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(p)}
                className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-sm font-medium"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
              >
                <Trash2 size={14} /> Apagar
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && !editing && !isAdding && (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            Nenhuma promoção. Clique em &quot;Nova promoção&quot; para criar uma.
          </div>
        )}
      </div>

      {(editing || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{editing?.id ? 'Editar' : 'Nova'} promoção</h3>
              <button
                onClick={() => {
                  setEditing(null);
                  setIsAdding(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Título *</label>
                <input
                  name="title"
                  defaultValue={editing?.title}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Promoção de Verão"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Texto de desconto</label>
                <input
                  name="discount_text"
                  defaultValue={editing?.discount_text}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: 20% de desconto"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descrição (opcional)</label>
                <textarea
                  name="description"
                  defaultValue={editing?.description}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Ex: Em todos os pneus até 30/06"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Link (opcional)</label>
                <input
                  name="link_url"
                  defaultValue={editing?.link_url}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: /categorie/pneus-auto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Data início</label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    defaultValue={editing?.start_date ? editing.start_date.slice(0, 16) : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Data fim</label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    defaultValue={editing?.end_date ? editing.end_date.slice(0, 16) : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  id="promo_active"
                  defaultChecked={editing?.is_active !== false}
                  className="rounded text-blue-600"
                />
                <label htmlFor="promo_active" className="text-sm font-medium text-gray-700">
                  Promoção ativa (visível no site)
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ordem</label>
                <input
                  type="number"
                  name="sort_order"
                  defaultValue={editing?.sort_order ?? 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-[#0066CC] text-white px-4 py-2 rounded-lg font-bold text-sm"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setIsAdding(false);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
