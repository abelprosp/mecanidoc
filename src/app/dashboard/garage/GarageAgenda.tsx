"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';

type Appointment = {
  id: string;
  product_name: string | null;
  quantity: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  scheduled_at: string | null;
  notes: string | null;
  order_id: string | null;
  payment_status: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'À planifier',
  scheduled: 'Planifié',
  confirmed: 'Confirmé',
  done: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GarageAgenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/garage/appointments', { credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Impossible de charger l’agenda.');
      setAppointments([]);
    } else {
      setAppointments(json.appointments || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/garage/slots?date=${date}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => setSlots(json.slots || []))
      .catch(() => setSlots([]));
  }, [selected, date]);

  const pending = useMemo(() => appointments.filter((a) => a.status === 'pending' || !a.scheduled_at), [appointments]);
  const upcoming = useMemo(
    () => appointments.filter((a) => a.scheduled_at && ['scheduled', 'confirmed'].includes(a.status)),
    [appointments]
  );

  const saveSlot = async (status?: string) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/garage/appointments/${selected.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time: time || undefined, status }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || 'Enregistrement impossible.');
      return;
    }
    setSelected(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Planning des montages</h1>
        <p className="text-gray-500 text-sm">Attribuez un créneau, confirmez ou replanifiez. La capacité quotidienne est respectée.</p>
      </header>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">À planifier ({pending.length})</h2>
        <AgendaList items={pending} empty="Aucune demande en attente." onPick={setSelected} />
      </section>
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Confirmés / planifiés ({upcoming.length})</h2>
        <AgendaList items={upcoming} empty="Aucun rendez-vous planifié." onPick={setSelected} />
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 mb-1">{selected.product_name || 'Montage'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {selected.customer_name} {selected.customer_phone ? `· ${selected.customer_phone}` : ''} · Qté {selected.quantity}
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="apt-date">Date</label>
            <input id="apt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-3 w-full rounded-lg border px-3 py-2" />
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="apt-time">Créneau</label>
            <select id="apt-time" value={time} onChange={(e) => setTime(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2 bg-white">
              <option value="">Choisir…</option>
              {slots.map((s) => (
                <option key={s.time} value={s.time} disabled={!s.available}>
                  {s.time}{s.available ? '' : ' (complet)'}
                </option>
              ))}
            </select>
            {slots.length === 0 ? <p className="text-xs text-gray-500 mb-3">Aucun créneau ce jour (fermé ou hors horaires).</p> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || !time} onClick={() => saveSlot('scheduled')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? '…' : 'Planifier'}
              </button>
              <button type="button" disabled={saving} onClick={() => saveSlot('confirmed')} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Confirmer
              </button>
              <button type="button" disabled={saving} onClick={() => saveSlot('done')} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Terminé
              </button>
              <button type="button" disabled={saving} onClick={() => saveSlot('cancelled')} className="rounded-lg border px-4 py-2 text-sm font-semibold text-red-700">
                Annuler
              </button>
              <button type="button" onClick={() => setSelected(null)} className="ml-auto text-sm text-gray-500">Fermer</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AgendaList({ items, empty, onPick }: { items: Appointment[]; empty: string; onPick: (a: Appointment) => void }) {
  if (!items.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">
        <Calendar size={40} className="mx-auto mb-3 opacity-20" />
        <p>{empty}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y">
      {items.map((apt) => (
        <button
          key={apt.id}
          type="button"
          onClick={() => onPick(apt)}
          className="w-full text-left p-5 hover:bg-gray-50 flex items-center justify-between gap-4"
        >
          <div>
            <p className="font-bold text-gray-800">{apt.product_name || 'Montage'}</p>
            <p className="text-sm text-gray-600">{apt.customer_name} {apt.customer_phone ? `· ${apt.customer_phone}` : ''}</p>
            <p className="text-xs text-gray-500 mt-1">
              {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('fr-FR') : 'Sans horaire'} · Qté {apt.quantity}
            </p>
          </div>
          <span className="text-xs font-bold rounded-full px-3 py-1 bg-blue-50 text-blue-700">
            {STATUS_LABEL[apt.status] || apt.status}
          </span>
        </button>
      ))}
    </div>
  );
}
