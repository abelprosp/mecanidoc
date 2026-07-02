#!/usr/bin/env node
/**
 * Gera docker/postgres/init/02-schema.sql a partir de run_all_migrations.sql
 * Adapta auth.users → public.users e remove peças específicas do Supabase Cloud.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'run_all_migrations.sql');
const extra = path.join(root, 'create_neumaticos_andres_integration.sql');
const outDir = path.join(root, 'docker/postgres/init');
const outFile = path.join(outDir, '02-schema.sql');

let sql = fs.readFileSync(source, 'utf8');

sql = sql.replace(/references auth\.users/gi, 'references public.users');
sql = sql.replace(/auth\.users/g, 'public.users');
sql = sql.replace(/auth\.uid\(\)/g, 'auth.uid()');

sql = sql.replace(
  /create or replace function public\.handle_new_user[\s\S]*?create trigger on_auth_user_created[\s\S]*?handle_new_user\(\);/m,
  '-- Perfil criado na app (signUp) em vez de trigger Supabase'
);

sql = sql.replace(
  /-- 14\. Master user[\s\S]*?END \$\$;/m,
  '-- Master user em 04-seed.sql'
);

sql = sql.replace(/to authenticated/g, 'to public');

if (fs.existsSync(extra)) {
  sql += '\n\n-- Neumáticos Andrés\n';
  sql += fs.readFileSync(extra, 'utf8');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, sql);
console.log('Gerado:', outFile);
