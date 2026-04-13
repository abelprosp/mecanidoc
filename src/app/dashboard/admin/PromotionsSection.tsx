"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Loader2, Tag, Trash2, Plus, ImageIcon } from "lucide-react";

const OVERLAY_OPTIONS = [
  { value: "strong", label: "Forte (texte très lisible)" },
  { value: "medium", label: "Moyenne (recommandé)" },
  { value: "soft", label: "Légère (photo plus visible)" },
] as const;

export default function PromotionsSection() {
  const supabase = createClient();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchPromotions = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.from("promotions").select("*").order("sort_order", { ascending: true });
    if (error) {
      console.error("promotions:", error);
      setErrorMsg(
        'Table « promotions » introuvable dans ce projet Supabase. Exécutez les scripts SQL (migrations).'
      );
      setPromotions([]);
      setLoading(false);
      return;
    }
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
    const parentRaw = ((formData.get("parent_category") as string) || "").trim();
    const badgeColorRaw = ((formData.get("badge_color") as string) || "").trim();
    let overlayRaw = ((formData.get("card_overlay") as string) || "medium").trim().toLowerCase();
    if (!["strong", "medium", "soft"].includes(overlayRaw)) overlayRaw = "medium";

    const payload = {
      title: formData.get("title") as string,
      discount_text: (formData.get("discount_text") as string) || null,
      description: (formData.get("description") as string) || null,
      link_url: (formData.get("link_url") as string) || null,
      is_active: formData.get("is_active") === "on",
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
      parent_category: parentRaw || null,
      badge_text: ((formData.get("badge_text") as string) || "").trim() || null,
      badge_color: badgeColorRaw || null,
      card_image_url: ((formData.get("card_image_url") as string) || "").trim() || null,
      card_overlay: overlayRaw,
      updated_at: new Date().toISOString(),
    };
    if (editing?.id) {
      const { error } = await supabase.from("promotions").update(payload).eq("id", editing.id);
      if (error) {
        alert(`Erreur lors de l'enregistrement : ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("promotions").insert([payload]);
      if (error) {
        alert(`Erreur lors de la création : ${error.message}`);
        return;
      }
    }
    setEditing(null);
    setIsAdding(false);
    fetchPromotions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
      return;
    }
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Promotions &amp; publicité</h1>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setEditing({
              title: "",
              discount_text: "20%",
              description: "",
              link_url: "",
              is_active: true,
              sort_order: promotions.length,
              card_overlay: "medium",
            });
          }}
          className="bg-[#0066CC] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nouvelle promotion
        </button>
      </header>

      <p className="text-gray-600 text-sm mb-6 leading-relaxed">
        <strong>Catégorie mère vide</strong> : la promotion s&apos;affiche dans le <strong>bandeau orange</strong> en haut
        du site. Avec <strong>Auto, Moto, Camion ou Tracteurs</strong> : elle apparaît dans le{" "}
        <strong>carrousel d&apos;offres</strong> sur l&apos;accueil et les pages concernées, au-dessus des meilleures
        ventes. Pour le carrousel, vous pouvez ajouter une <strong>image de fond</strong> avec un voile pour garder le
        texte lisible.
      </p>
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      )}

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
                  {p.parent_category && (
                    <span className="inline-block mr-2 text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {p.parent_category}
                    </span>
                  )}
                  {p.card_image_url && (
                    <span className="inline-flex items-center gap-1 mr-2 text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                      <ImageIcon size={12} /> Fond
                    </span>
                  )}
                  {p.discount_text && <span className="text-green-600 font-medium">{p.discount_text}</span>}
                  {p.discount_text && p.description && " · "}
                  {p.description && <span className="truncate block">{p.description}</span>}
                </p>
              </div>
              {!p.is_active && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-sm font-medium"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && !editing && !isAdding && (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            Aucune promotion. Cliquez sur « Nouvelle promotion » pour en créer une.
          </div>
        )}
      </div>

      {(editing || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl my-8 max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{editing?.id ? "Modifier" : "Nouvelle"} promotion</h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setIsAdding(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Titre *</label>
                <input
                  name="title"
                  defaultValue={editing?.title}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex. : Jusqu'à 80 € remboursés"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Texte d&apos;accroche / promo</label>
                <input
                  name="discount_text"
                  defaultValue={editing?.discount_text}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex. : 20 %, ou texte utilisé sur le badge si le champ « Badge » est vide"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description (sous-titre)</label>
                <textarea
                  name="description"
                  defaultValue={editing?.description}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Ex. : Sur les pneus Hankook jusqu'au 30/06"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Lien (optionnel)</label>
                <input
                  name="link_url"
                  defaultValue={editing?.link_url}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex. : /categorie/pneus-auto ou https://…"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Catégorie mère (carrousel)</label>
                <select
                  name="parent_category"
                  defaultValue={editing?.parent_category || ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">— Bandeau général uniquement (pas de carrousel)</option>
                  <option value="Auto">Auto</option>
                  <option value="Moto">Moto</option>
                  <option value="Camion">Camion</option>
                  <option value="Tracteurs">Tracteurs</option>
                </select>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Carte carrousel</p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Image de fond (URL)</label>
                  <input
                    name="card_image_url"
                    defaultValue={editing?.card_image_url || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="https://… (visible uniquement si une catégorie mère est choisie)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Superposition (voile sombre)</label>
                  <select
                    name="card_overlay"
                    defaultValue={editing?.card_overlay || "medium"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {OVERLAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  Laissez vide pour le fond dégradé par défaut. L&apos;image est recouverte d&apos;un dégradé sombre
                  pour garder le texte blanc lisible.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Texte du badge</label>
                  <input
                    name="badge_text"
                    defaultValue={editing?.badge_text || ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex. : PROMO, OFFRE"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Couleur du badge</label>
                  <select
                    name="badge_color"
                    defaultValue={editing?.badge_color || "red"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="red">Rouge</option>
                    <option value="green">Vert</option>
                    <option value="blue">Bleu</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Date de début</label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    defaultValue={editing?.start_date ? editing.start_date.slice(0, 16) : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Date de fin</label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    defaultValue={editing?.end_date ? editing.end_date.slice(0, 16) : ""}
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
                  Promotion active (visible sur le site)
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ordre d&apos;affichage</label>
                <input
                  type="number"
                  name="sort_order"
                  defaultValue={editing?.sort_order ?? 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-[#0066CC] text-white px-4 py-2 rounded-lg font-bold text-sm">
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setIsAdding(false);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
