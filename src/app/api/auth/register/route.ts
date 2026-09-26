import { NextRequest, NextResponse } from 'next/server';
import {
  registerUser,
  RegistrationError,
  SELF_SERVICE_ROLES,
  type GarageRegistration,
  type RegisterUserInput,
  type SelfServiceRole,
} from '@/lib/db/client';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';
import { isValidEmail, normalizeEmail, passwordProblem } from '@/lib/auth/validation';
import { sendVerificationEmail } from '@/lib/auth/email-verification';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

function parseGarage(raw: unknown): GarageRegistration | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const garage: GarageRegistration = {
    name: str(g.name, 120),
    address: str(g.address, 200),
    streetNumber: str(g.streetNumber, 20),
    addressComplement: str(g.addressComplement, 200),
    zipCode: str(g.zipCode, 16),
    city: str(g.city, 80),
    country: str(g.country, 40) || 'France',
    phonePrimary: str(g.phonePrimary, 30),
    phoneSecondary: str(g.phoneSecondary, 30),
    companyName: str(g.companyName, 160),
    siret: str(g.siret, 32),
    legalForm: str(g.legalForm, 40),
    tireTypes: {},
    openingHours: str(g.openingHours, 500),
  };
  if (g.tireTypes && typeof g.tireTypes === 'object') {
    for (const [k, v] of Object.entries(g.tireTypes as Record<string, unknown>)) {
      if (/^[a-zA-Z0-9_]{1,20}$/.test(k)) garage.tireTypes[k] = Boolean(v);
    }
  }
  const required: Array<keyof GarageRegistration> = ['name', 'address', 'zipCode', 'city', 'phonePrimary', 'companyName', 'siret', 'legalForm'];
  for (const key of required) {
    if (!garage[key]) return null;
  }
  return garage;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  // Compatibilidade com o antigo cliente (metadata.full_name / metadata.role)
  const metadata = (body.metadata && typeof body.metadata === 'object' ? body.metadata : {}) as Record<string, unknown>;
  const roleRaw = str(body.role ?? metadata.role, 20) || 'customer';
  const fullName = str(body.fullName ?? metadata.full_name, 120);
  const phone = str(body.phone, 30);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.', field: 'email' }, { status: 400 });
  }
  const pwdProblem = passwordProblem(password, email);
  if (pwdProblem) {
    return NextResponse.json({ error: pwdProblem, field: 'password' }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: 'Nom requis.', field: 'fullName' }, { status: 400 });
  }
  if (!(SELF_SERVICE_ROLES as readonly string[]).includes(roleRaw)) {
    return NextResponse.json({ error: 'Type de compte invalide.' }, { status: 400 });
  }
  const role = roleRaw as SelfServiceRole;

  const input: RegisterUserInput = { email, password, fullName, role, phone };

  if (role === 'garage') {
    const garage = parseGarage(body.garage);
    if (!garage) {
      return NextResponse.json({ error: 'Informations du garage incomplètes.' }, { status: 400 });
    }
    input.garage = garage;
  }
  if (role === 'company') {
    const c = (body.company && typeof body.company === 'object' ? body.company : {}) as Record<string, unknown>;
    const companyName = str(c.companyName, 160);
    if (!companyName) {
      return NextResponse.json({ error: "Nom de l'entreprise requis.", field: 'companyName' }, { status: 400 });
    }
    input.company = { companyName, vatNumber: str(c.vatNumber, 40) };
  }

  try {
    const user = await registerUser(input);
    // E-mail de confirmação (não bloqueia o registo se o SMTP não estiver configurado).
    const verificationSent = await sendVerificationEmail(user.id, user.email).catch(() => false);
    const token = await createSessionToken({ id: user.id, email: user.email, sv: 1 });
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
      emailConfirmed: false,
      verificationSent,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[auth/register]', error);
    return NextResponse.json({ error: "Impossible de créer le compte pour le moment." }, { status: 500 });
  }
}
