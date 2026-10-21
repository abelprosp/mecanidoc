/** Horaires par jour JS (0 = dimanche … 6 = samedi). */
export type OpeningHours = Record<string, Array<[string, string]>>;

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  '1': [['08:00', '12:00'], ['13:30', '18:00']],
  '2': [['08:00', '12:00'], ['13:30', '18:00']],
  '3': [['08:00', '12:00'], ['13:30', '18:00']],
  '4': [['08:00', '12:00'], ['13:30', '18:00']],
  '5': [['08:00', '12:00'], ['13:30', '18:00']],
  '6': [],
  '0': [],
};

export function parseHm(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function minutesToHm(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Créneaux HH:MM d'une date locale (YYYY-MM-DD). */
export function slotsForDay(
  dateIso: string,
  openingHours: OpeningHours = DEFAULT_OPENING_HOURS,
  slotMinutes = 60
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return [];
  const duration = Number.isInteger(slotMinutes) && slotMinutes >= 15 && slotMinutes <= 240 ? slotMinutes : 60;
  const [y, mo, d] = dateIso.split('-').map(Number);
  const day = new Date(y, mo - 1, d).getDay();
  const windows = openingHours[String(day)] || [];
  const out: string[] = [];
  for (const win of windows) {
    const start = parseHm(win[0]);
    const end = parseHm(win[1]);
    if (start == null || end == null || end <= start) continue;
    for (let t = start; t + duration <= end; t += duration) {
      out.push(minutesToHm(t));
    }
  }
  return out;
}

export function slotDateTime(dateIso: string, hm: string): Date | null {
  const minutes = parseHm(hm);
  if (minutes == null || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const [y, mo, d] = dateIso.split('-').map(Number);
  return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

export function isSlotTaken(hm: string, bookedHms: string[], dailyCapacity: number, bookedThatDay: number): boolean {
  if (bookedThatDay >= dailyCapacity) return true;
  return bookedHms.includes(hm);
}
