import 'server-only';

import type { DbOperation } from './query-builder';

/**
 * Política de acesso da API genérica `/api/db`.
 *
 * Esta lista é a primeira barreira: só tabelas aqui declaradas podem ser tocadas a
 * partir do browser, e só com o nível mínimo indicado. As políticas RLS do PostgreSQL
 * continuam a aplicar-se por cima (linha a linha), e o utilizador de ligação da app
 * não é dono das tabelas, pelo que não as pode contornar.
 *
 * Níveis: `public` (anónimo), `auth` (sessão válida), `master` (perfil master), `none`.
 */
export type Access = 'public' | 'auth' | 'master' | 'none';

export type TablePolicy = {
  select: Access;
  insert: Access;
  update: Access;
  delete: Access;
  /** Colunas visíveis para quem não é master. `*` é reescrito para esta lista. */
  publicColumns?: string[];
  /** Colunas que utilizadores não-master não podem escrever (papéis, aprovações, saldos). */
  protectedColumns?: string[];
  /** Colunas que nunca podem ser lidas/escritas via API genérica, mesmo por master. */
  secretColumns?: string[];
};

const MASTER_ONLY_WRITE = { insert: 'master', update: 'master', delete: 'master' } as const;
const NO_WRITE = { insert: 'none', update: 'none', delete: 'none' } as const;

export const TABLE_POLICIES: Record<string, TablePolicy> = {
  // Catálogo e conteúdo público
  products: { select: 'public', insert: 'auth', update: 'auth', delete: 'auth' },
  brands: { select: 'public', ...MASTER_ONLY_WRITE },
  taxes: { select: 'public', ...MASTER_ONLY_WRITE },
  promotions: { select: 'public', ...MASTER_ONLY_WRITE },
  faqs: { select: 'public', ...MASTER_ONLY_WRITE },
  footer_links: { select: 'public', ...MASTER_ONLY_WRITE },
  category_pages: { select: 'public', ...MASTER_ONLY_WRITE },
  menu_subcategories: { select: 'public', ...MASTER_ONLY_WRITE },
  global_settings: {
    select: 'public',
    ...MASTER_ONLY_WRITE,
    publicColumns: [
      'id',
      'platform_fee_percentage',
      'default_tax_rate',
      'delivery_base_fee',
      'fast_delivery_fee',
      'fast_delivery_fee_bulk',
      'warranty_fee',
      'free_standard_delivery_min_qty',
      'promotional_banner_url',
      'is_maintenance_mode',
    ],
    // Segredos de integração só via rotas dedicadas (encriptação no servidor).
    secretColumns: [
      'na_api_password_enc',
      'stripe_secret_key_enc',
      'stripe_webhook_secret_enc',
    ],
  },
  garages: { select: 'public', insert: 'none', update: 'auth', delete: 'master',
    protectedColumns: ['is_approved', 'commission_balance', 'profile_id'] },

  // Contas e perfis
  profiles: { select: 'auth', insert: 'master', update: 'auth', delete: 'none',
    protectedColumns: ['role', 'supplier_promotion_pending', 'email'] },
  suppliers: { select: 'auth', insert: 'master', update: 'auth', delete: 'master',
    protectedColumns: ['is_approved', 'profile_id'] },
  companies: { select: 'auth', insert: 'none', update: 'auth', delete: 'master',
    protectedColumns: ['discount_tier', 'profile_id'] },

  // Encomendas: só leitura; criação e alterações passam por rotas de domínio.
  orders: { select: 'auth', ...NO_WRITE },
  order_items: { select: 'auth', ...NO_WRITE },
  supplier_orders: { select: 'auth', ...NO_WRITE },
  order_shipments: { select: 'auth', ...NO_WRITE },
  supplier_api_keys: { select: 'auth', ...NO_WRITE },

  // Administração
  support_mail_settings: { select: 'master', ...MASTER_ONLY_WRITE },
};

const LEVEL: Record<Exclude<Access, 'none'>, number> = { public: 0, auth: 1, master: 2 };

export type Actor = { userId: string | null; isMaster: boolean };

export function actorLevel(actor: Actor): number {
  if (actor.isMaster) return LEVEL.master;
  if (actor.userId) return LEVEL.auth;
  return LEVEL.public;
}

export function requiredAccess(policy: TablePolicy, operation: DbOperation): Access {
  if (operation === 'select') return policy.select;
  if (operation === 'insert') return policy.insert;
  if (operation === 'update') return policy.update;
  if (operation === 'delete') return policy.delete;
  // upsert precisa de ambos
  const a = policy.insert;
  const b = policy.update;
  if (a === 'none' || b === 'none') return 'none';
  return LEVEL[a] >= LEVEL[b] ? a : b;
}

export function isAllowed(policy: TablePolicy, operation: DbOperation, actor: Actor): boolean {
  const need = requiredAccess(policy, operation);
  if (need === 'none') return false;
  return actorLevel(actor) >= LEVEL[need];
}

/**
 * Reescreve a projeção para quem não é master quando a tabela define `publicColumns`.
 * Relações embutidas (`brands(id,name)`) não são afetadas.
 */
export function restrictSelect(policy: TablePolicy, select: string, actor: Actor): string {
  const secret = new Set(policy.secretColumns || []);
  const publicCols = !actor.isMaster && policy.publicColumns ? policy.publicColumns : null;
  const allowed = publicCols ? new Set(publicCols) : null;
  const trimmed = select.trim();

  if (!trimmed || trimmed === '*') {
    if (publicCols) return publicCols.join(', ');
    return '*';
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part === '*') {
      out.push(publicCols ? publicCols.join(', ') : '*');
      continue;
    }
    if (/\(/.test(part)) {
      out.push(part);
      continue;
    }
    const base = part.split('->>')[0];
    if (secret.has(base)) {
      throw new Error(`Coluna não permitida: ${part}`);
    }
    if (allowed && !allowed.has(base)) {
      throw new Error(`Coluna não permitida: ${part}`);
    }
    out.push(part);
  }
  return out.join(', ');
}

/**
 * Remove colunas secretas (para todos) e protegidas (para não-master) de um payload
 * de escrita. Devolve as chaves rejeitadas.
 */
export function stripProtectedColumns(
  policy: TablePolicy,
  payload: Record<string, unknown> | Record<string, unknown>[] | undefined,
  actor: Actor
): string[] {
  if (!payload) return [];
  const blocked = [
    ...(policy.secretColumns || []),
    ...(!actor.isMaster ? policy.protectedColumns || [] : []),
  ];
  if (!blocked.length) return [];
  const rows = Array.isArray(payload) ? payload : [payload];
  const rejected = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const col of blocked) {
      if (col in row) {
        delete (row as Record<string, unknown>)[col];
        rejected.add(col);
      }
    }
  }
  return Array.from(rejected);
}
