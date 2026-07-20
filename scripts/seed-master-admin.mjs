#!/usr/bin/env node
/**
 * Cria ou atualiza um utilizador master (super admin) no MecaniDoc.
 *
 * Idempotente: se o email já existir, atualiza password_hash e role=master.
 *
 * Uso (no host — Postgres via porta publicada):
 *   npm run docker:postgres
 *   npm run seed:master-admin
 *   DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc node scripts/seed-master-admin.mjs
 *
 * Nota: hostname "postgres" só funciona dentro da rede Docker Compose.
 * Este script reescreve automaticamente postgres → localhost quando corre no host.
 *
 * Overrides opcionais:
 *   MASTER_ADMIN_EMAIL=... MASTER_ADMIN_PASSWORD=... MASTER_ADMIN_NAME=...
 */
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import {
  resolveDatabaseUrl,
  formatDatabaseUrlHint,
} from './lib/resolve-database-url.mjs';

loadEnvFiles();

const { Client } = pg;

const BCRYPT_ROUNDS = 10; // igual a src/lib/auth/password.ts

const email = (process.env.MASTER_ADMIN_EMAIL || 'joaogodinho422@gmail.com').trim().toLowerCase();
const password = process.env.MASTER_ADMIN_PASSWORD || 'Mecanidoc2023-';
const fullName = process.env.MASTER_ADMIN_NAME || 'João Godinho';

const resolved = resolveDatabaseUrl(process.env.DATABASE_URL);
const dbUrl = resolved.url;

if (resolved.rewritten) {
  console.warn(
    'Aviso: DATABASE_URL usava hostname "postgres" (só válido na rede Docker).' +
      ' A conectar via localhost (script a correr no host).'
  );
}

async function main() {
  if (!email || !password) {
    throw new Error('Email e password são obrigatórios.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
  } catch (err) {
    const hint = formatDatabaseUrlHint(err, process.env.DATABASE_URL || dbUrl);
    throw new Error(`${err.message || err}${hint}`);
  }

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, email FROM public.users WHERE lower(email) = $1 LIMIT 1',
      [email]
    );

    let userId;
    let action;

    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      action = 'updated';
      await client.query(
        `UPDATE public.users
         SET password_hash = $1,
             email = $2,
             raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $3::jsonb,
             updated_at = now()
         WHERE id = $4`,
        [passwordHash, email, JSON.stringify({ full_name: fullName }), userId]
      );
    } else {
      userId = randomUUID();
      action = 'created';
      await client.query(
        `INSERT INTO public.users (id, email, password_hash, raw_user_meta_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [userId, email, passwordHash, JSON.stringify({ full_name: fullName })]
      );
    }

    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role)
       VALUES ($1, $2, $3, 'master')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         role = 'master',
         updated_at = timezone('utc'::text, now())`,
      [userId, email, fullName]
    );

    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT u.id, u.email, p.role, p.full_name
       FROM public.users u
       JOIN public.profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    const user = rows[0];
    const { rows: hashRows } = await client.query(
      'SELECT password_hash FROM public.users WHERE id = $1',
      [userId]
    );
    const storedHash = hashRows[0]?.password_hash || '';
    const passwordOk = storedHash ? await bcrypt.compare(password, storedHash) : false;

    console.log(`Master admin ${action}:`);
    console.log(`  id:    ${user.id}`);
    console.log(`  email: ${user.email}`);
    console.log(`  name:  ${user.full_name}`);
    console.log(`  role:  ${user.role}`);
    console.log(`  db:    ${dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
    console.log(`  password check: ${passwordOk ? 'ok' : 'FAILED'}`);
    if (!passwordOk) {
      throw new Error('Hash gravado não verifica a password — abort.');
    }
    console.log('');
    console.log('Login local (mesma BD que este seed):');
    console.log('  1. Garanta .env na raiz com:');
    console.log('     DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc');
    console.log('     AUTH_SECRET=... (mín. 16 chars)');
    console.log('  2. npm run docker:postgres');
    console.log('  3. npm run dev  →  http://localhost:3002/auth/login');
    console.log(`  4. Email: ${email}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falha ao criar master admin:', err.message || err);
  process.exit(1);
});
