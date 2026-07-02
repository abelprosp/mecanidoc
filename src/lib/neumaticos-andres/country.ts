const COUNTRY_MAP: Record<string, string> = {
  france: 'FR',
  fr: 'FR',
  belgique: 'BE',
  belgium: 'BE',
  be: 'BE',
  luxembourg: 'LU',
  lu: 'LU',
  portugal: 'PT',
  pt: 'PT',
  espagne: 'ES',
  spain: 'ES',
  es: 'ES',
  allemagne: 'DE',
  germany: 'DE',
  de: 'DE',
};

export function toAlpha2Country(country: string | null | undefined): string {
  const raw = (country || 'FR').trim();
  if (raw.length === 2) return raw.toUpperCase();
  const mapped = COUNTRY_MAP[raw.toLowerCase()];
  return mapped || 'FR';
}

export function splitContactName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName || 'Client').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Client', lastName: 'MecaniDoc' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
