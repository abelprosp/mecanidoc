import { NextResponse } from 'next/server';
import { requireGarageUser } from '@/lib/admin-auth-server';
import { withAdminContext } from '@/lib/db/pool';

export async function GET() {
  const auth = await requireGarageUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.garage) return NextResponse.json({ error: 'Garage introuvable' }, { status: 404 });

  const garageId = String(auth.garage.id);
  let rows: Record<string, unknown>[] = [];
  try {
    rows = await withAdminContext(async (client) => {
      const { rows } = await client.query(
        `select a.*, o.status as order_status, o.payment_status, o.created_at as order_created_at
           from public.garage_appointments a
           left join public.orders o on o.id = a.order_id
          where a.garage_id = $1
          order by coalesce(a.scheduled_at, a.created_at) desc
          limit 200`,
        [garageId]
      );
      return rows;
    });
  } catch (error) {
    console.warn('[garage/appointments] table manquante ? appliquez 07-garage-agenda.sql', error);
  }

  return NextResponse.json({
    garage: {
      id: garageId,
      name: auth.garage.name,
      slot_minutes: auth.garage.slot_minutes,
      daily_capacity: auth.garage.daily_capacity,
      opening_hours: auth.garage.opening_hours,
    },
    appointments: rows,
  });
}
