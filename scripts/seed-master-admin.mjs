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
import { spawnSync } from 'child_process';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
import {
  resolveSuperuserDatabaseUrl,
  formatDatabaseUrlHint,
} from './lib/resolve-database-url.mjs';

loadEnvFiles();

const { Client } = pg;

const BCRYPT_ROUNDS = 10; // igual a src/lib/auth/password.ts

const email = (process.env.MASTER_ADMIN_EMAIL || 'joaogodinho422@gmail.com').trim().toLowerCase();
const password = process.env.MASTER_ADMIN_PASSWORD || 'Mecanidoc2023-';
const fullName = process.env.MASTER_ADMIN_NAME || 'João Godinho';

const resolved = resolveSuperuserDatabaseUrl();
const dbUrl = resolved.url;

if (resolved.via === 'POSTGRES_PASSWORD') {
  console.warn(
    `Seed via superuser ${process.env.POSTGRES_USER || 'mecanidoc'}@127.0.0.1:${process.env.MECANIDOC_POSTGRES_PORT || '5434'} (não usa mecanidoc_app).`
  );
} else if (resolved.rewritten) {
  console.warn('Aviso: a ligar via 127.0.0.1 em vez do hostname Docker "postgres".');
}

function sqlLit(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function dockerPsql(sql) {
  const user = process.env.POSTGRES_USER || 'mecanidoc';
  const db = process.env.POSTGRES_DB || 'mecanidoc';
  const r = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', db, '-A', '-t'],
    { input: sql, encoding: 'utf8' }
  );
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'docker compose exec postgres falhou').trim());
  }
  return (r.stdout || '').trim();
}

async function connectClient() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    return client;
  } catch (err) {
    const msg = err?.message || String(err);
    if (!/password authentication failed|ECONNREFUSED|28P01/i.test(msg)) {
      const hint = formatDatabaseUrlHint(err, process.env.DATABASE_URL || dbUrl);
      throw new Error(`${msg}${hint}`);
    }
    console.warn(
      `Ligação TCP falhou (${msg}). A gravar via docker compose exec postgres (socket interno, sem senha do host).`
    );
    return null;
  }
}

async function seedViaDocker(passwordHash) {
  const existingId = dockerPsql(
    `SELECT id FROM public.users WHERE lower(email) = lower(${sqlLit(email)}) LIMIT 1;`
  );
  const userId = existingId || randomUUID();
  const action = existingId ? 'updated' : 'created';
  const meta = JSON.stringify({ full_name: fullName });

  if (existingId) {
    dockerPsql(`
      UPDATE public.users
      SET password_hash = ${sqlLit(passwordHash)},
          email = ${sqlLit(email)},
          raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || ${sqlLit(meta)}::jsonb,
          updated_at = now()
      WHERE id = ${sqlLit(userId)}::uuid;
    `);
  } else {
    dockerPsql(`
      INSERT INTO public.users (id, email, password_hash, raw_user_meta_data)
      VALUES (${sqlLit(userId)}::uuid, ${sqlLit(email)}, ${sqlLit(passwordHash)}, ${sqlLit(meta)}::jsonb);
    `);
  }

  dockerPsql(`
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (${sqlLit(userId)}::uuid, ${sqlLit(email)}, ${sqlLit(fullName)}, 'master')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'master',
      updated_at = timezone('utc'::text, now());
  `);

  const storedHash = dockerPsql(
    `SELECT password_hash FROM public.users WHERE id = ${sqlLit(userId)}::uuid;`
  );
  const passwordOk = storedHash ? await bcrypt.compare(password, storedHash) : false;
  return { userId, action, passwordOk, via: 'docker compose exec postgres' };
}

async function main() {
  if (!email || !password) {
    throw new Error('Email e password são obrigatórios.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await connectClient();

  if (!client) {
    const seeded = await seedViaDocker(passwordHash);
    console.log(`Master admin ${seeded.action}:`);
    console.log(`  email: ${email}`);
    console.log(`  name:  ${fullName}`);
    console.log(`  role:  master`);
    console.log(`  via:   ${seeded.via}`);
    console.log(`  password check: ${seeded.passwordOk ? 'ok' : 'FAILED'}`);
    if (!seeded.passwordOk) {
      throw new Error('Hash gravado não verifica a password — abort.');
    }
    console.log('');
    console.log('Login do SITE (não é a senha do Postgres):');
    console.log(`  Email: ${email}`);
    console.log('  Password: a definida em MASTER_ADMIN_PASSWORD no .env');
    return;
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
    console.log('Login do SITE (não é a senha do Postgres):');
    console.log(`  Email: ${email}`);
    console.log('  Password: a definida em MASTER_ADMIN_PASSWORD no .env');
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
