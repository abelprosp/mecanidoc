import { NextRequest, NextResponse } from 'next/server';
import { requireGarageUser } from '@/lib/admin-auth-server';
import { withAdminContext } from '@/lib/db/pool';
import { DEFAULT_OPENING_HOURS, isSlotTaken, slotsForDay, type OpeningHours } from '@/lib/garage/slots';

export async function GET(request: NextRequest) {
  const auth = await requireGarageUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.garage) return NextResponse.json({ error: 'Garage introuvable' }, { status: 404 });

  const date = request.nextUrl.searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide (YYYY-MM-DD).' }, { status: 400 });
  }

  const hours = (auth.garage.opening_hours as OpeningHours) || DEFAULT_OPENING_HOURS;
  const slotMinutes = Number(auth.garage.slot_minutes) || 60;
  const capacity = Number(auth.garage.daily_capacity) || 8;
  const all = slotsForDay(date, hours, slotMinutes);

  const booked = await withAdminContext(async (client) => {
    const { rows } = await client.query<{ hm: string }>(
      `select to_char(scheduled_at at time zone 'Europe/Paris', 'HH24:MI') as hm
         from public.garage_appointments
        where garage_id = $1
          and scheduled_at is not null
          and status not in ('cancelled','no_show')
          and (scheduled_at at time zone 'Europe/Paris')::date = $2::date`,
      [auth.garage!.id, date]
    );
    return rows.map((r) => r.hm);
  });

  const slots = all.map((hm) => ({
    time: hm,
    available: !isSlotTaken(hm, booked, capacity, booked.length),
  }));

  return NextResponse.json({ date, slots, capacity, booked: booked.length });
}
