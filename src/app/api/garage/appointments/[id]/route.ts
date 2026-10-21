import { NextRequest, NextResponse } from 'next/server';
import { requireGarageUser } from '@/lib/admin-auth-server';
import { withAdminContext } from '@/lib/db/pool';
import { DEFAULT_OPENING_HOURS, isSlotTaken, slotDateTime, slotsForDay, type OpeningHours } from '@/lib/garage/slots';

const STATUSES = new Set(['pending', 'scheduled', 'confirmed', 'done', 'cancelled', 'no_show']);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireGarageUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.garage) return NextResponse.json({ error: 'Garage introuvable' }, { status: 404 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status : null;
  if (status && !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined;
  const date = typeof body.date === 'string' ? body.date : null;
  const time = typeof body.time === 'string' ? body.time : null;

  try {
    const row = await withAdminContext(async (client) => {
      const { rows: existing } = await client.query<{ id: string; garage_id: string }>(
        `select id, garage_id from public.garage_appointments where id = $1 and garage_id = $2`,
        [id, auth.garage!.id]
      );
      if (!existing[0]) return null;

      let scheduledAt: Date | null | undefined;
      let nextStatus = status;
      if (date && time) {
        const when = slotDateTime(date, time);
        if (!when) throw new Error('Créneau invalide.');
        const hours = (auth.garage!.opening_hours as OpeningHours) || DEFAULT_OPENING_HOURS;
        const slotMinutes = Number(auth.garage!.slot_minutes) || 60;
        const capacity = Number(auth.garage!.daily_capacity) || 8;
        const allowed = slotsForDay(date, hours, slotMinutes);
        if (!allowed.includes(time)) throw new Error('Ce créneau n’est pas dans les horaires d’ouverture.');

        const { rows: bookedRows } = await client.query<{ hm: string }>(
          `select to_char(scheduled_at at time zone 'Europe/Paris', 'HH24:MI') as hm
             from public.garage_appointments
            where garage_id = $1
              and id <> $2
              and scheduled_at is not null
              and status not in ('cancelled','no_show')
              and (scheduled_at at time zone 'Europe/Paris')::date = $3::date`,
          [auth.garage!.id, id, date]
        );
        const booked = bookedRows.map((r) => r.hm);
        if (isSlotTaken(time, booked, capacity, booked.length)) {
          throw new Error('Créneau complet.');
        }
        scheduledAt = when;
        if (!nextStatus || nextStatus === 'pending') nextStatus = 'scheduled';
      }

      const { rows } = await client.query(
        `update public.garage_appointments
            set status = coalesce($2, status),
                notes = coalesce($3, notes),
                scheduled_at = coalesce($4, scheduled_at),
                updated_at = now()
          where id = $1
        returning *`,
        [id, nextStatus, notes ?? null, scheduledAt ?? null]
      );
      return rows[0];
    });

    if (!row) return NextResponse.json({ error: 'Rendez-vous introuvable.' }, { status: 404 });
    return NextResponse.json({ appointment: row });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Impossible de mettre à jour.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
