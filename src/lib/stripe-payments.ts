import 'server-only';

import type { DbClient } from '@/lib/db/client';
import { withAdminContext } from '@/lib/db/pool';
import { fulfillNeumaticosAndresOrder } from '@/lib/neumaticos-andres/fulfill-order';
import { getNaIntegrationSettings } from '@/lib/neumaticos-andres/server-helpers';
import { NEUMATICOS_ANDRES_SUPPLIER } from '@/lib/neumaticos-andres/types';
import { buildCustomerOrderId } from '@/lib/neumaticos-andres/config';

export const STRIPE_CURRENCY = 'eur';
/** Montant minimum Stripe pour EUR (50 centimes). */
export const STRIPE_MIN_AMOUNT_CENTS = 50;
/** Nombre maximal de tentatives automatiques d'envoi au fournisseur. */
export const MAX_FULFILLMENT_ATTEMPTS = 5;

export type MarkOrderPaidOptions = {
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
  /** Montant confirmé par Stripe (centimes). Si fourni, doit correspondre au total de la commande. */
  amountCents?: number | null;
  /** Devise confirmée par Stripe (ex. "eur"). */
  currency?: string | null;
};

export type MarkOrderPaidResult = {
  ok: boolean;
  alreadyPaid: boolean;
  updated: boolean;
  error?: string;
  code?: 'NOT_FOUND' | 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'DB_ERROR';
};

export function toStripeAmountCents(amount: number | string | null | undefined): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

export function extractPaymentIntentId(
  paymentIntent: string | { id?: string } | null | undefined
): string | null {
  if (!paymentIntent) return null;
  if (typeof paymentIntent === 'string') return paymentIntent;
  return paymentIntent.id ?? null;
}

type OrderPayRow = {
  id: string;
  payment_status: string | null;
  total_amount: string | number;
  currency: string | null;
};

/**
 * Marque une commande comme payée de façon atomique et idempotente.
 *
 * La transition `pending → paid` est faite par un UPDATE conditionnel
 * (`WHERE payment_status <> 'paid'`) : deux webhooks concurrents ne peuvent pas
 * déclencher deux fois le fulfillment. Le montant et la devise Stripe sont vérifiés
 * contre la commande avant toute mise à jour.
 */
export async function markOrderPaid(
  _supabase: DbClient,
  orderId: string,
  opts: MarkOrderPaidOptions = {}
): Promise<MarkOrderPaidResult> {
  let outcome: MarkOrderPaidResult;

  try {
    outcome = await withAdminContext(async (client) => {
      const { rows } = await client.query<OrderPayRow>(
        `select id, payment_status, total_amount, currency
           from public.orders where id = $1 for update`,
        [orderId]
      );
      const order = rows[0];
      if (!order) {
        return { ok: false, alreadyPaid: false, updated: false, error: 'Order not found', code: 'NOT_FOUND' as const };
      }

      const expectedCents = toStripeAmountCents(order.total_amount);
      if (typeof opts.amountCents === 'number' && opts.amountCents > 0 && opts.amountCents !== expectedCents) {
        return {
          ok: false,
          alreadyPaid: order.payment_status === 'paid',
          updated: false,
          error: `Amount mismatch: stripe=${opts.amountCents} order=${expectedCents}`,
          code: 'AMOUNT_MISMATCH' as const,
        };
      }
      const orderCurrency = (order.currency || STRIPE_CURRENCY).toLowerCase();
      if (opts.currency && opts.currency.toLowerCase() !== orderCurrency) {
        return {
          ok: false,
          alreadyPaid: order.payment_status === 'paid',
          updated: false,
          error: `Currency mismatch: stripe=${opts.currency} order=${orderCurrency}`,
          code: 'CURRENCY_MISMATCH' as const,
        };
      }

      const alreadyPaid = order.payment_status === 'paid';

      const update = await client.query(
        `update public.orders
            set payment_status = 'paid',
                status = case when coalesce(status, 'pending') in ('pending', 'failed', 'canceled') then 'paid' else status end,
                payment_method = coalesce(payment_method, 'stripe'),
                stripe_payment_intent_id = coalesce(stripe_payment_intent_id, $2),
                stripe_checkout_session_id = coalesce($3, stripe_checkout_session_id),
                stripe_customer_id = coalesce(stripe_customer_id, $4),
                supplier_fulfillment_status = case
                  when coalesce(supplier_fulfillment_status, 'none') = 'none' then 'pending'
                  else supplier_fulfillment_status end
          where id = $1 and coalesce(payment_status, '') <> 'paid'`,
        [orderId, opts.paymentIntentId ?? null, opts.checkoutSessionId ?? null, opts.customerId ?? null]
      );

      if ((update.rowCount ?? 0) === 1) {
        return { ok: true, alreadyPaid: false, updated: true };
      }

      // Déjà payée : compléter les identifiants Stripe manquants uniquement.
      const fill = await client.query(
        `update public.orders
            set stripe_payment_intent_id = coalesce(stripe_payment_intent_id, $2),
                stripe_checkout_session_id = coalesce(stripe_checkout_session_id, $3),
                stripe_customer_id = coalesce(stripe_customer_id, $4)
          where id = $1
            and (
              (stripe_payment_intent_id is null and $2 is not null)
              or (stripe_checkout_session_id is null and $3 is not null)
              or (stripe_customer_id is null and $4 is not null)
            )`,
        [orderId, opts.paymentIntentId ?? null, opts.checkoutSessionId ?? null, opts.customerId ?? null]
      );
      return { ok: true, alreadyPaid, updated: (fill.rowCount ?? 0) > 0 };
    });
  } catch (error) {
    return {
      ok: false,
      alreadyPaid: false,
      updated: false,
      error: error instanceof Error ? error.message : 'DB error',
      code: 'DB_ERROR',
    };
  }

  // Fulfillment hors transaction (appel HTTP externe) — uniquement lors de la 1ʳᵉ transition.
  if (outcome.ok && outcome.updated && !outcome.alreadyPaid) {
    await attemptSupplierFulfillment(_supabase, orderId);
  }

  return outcome;
}

/**
 * Tente l'envoi au fournisseur et enregistre le résultat sur la commande
 * (`supplier_fulfillment_status`, compteur de tentatives, dernière erreur).
 * Les échecs sont repris par le cron (voir `retryPendingFulfillments`).
 */
export async function attemptSupplierFulfillment(admin: DbClient, orderId: string): Promise<void> {
  let settings: Awaited<ReturnType<typeof getNaIntegrationSettings>> = null;
  try {
    settings = await getNaIntegrationSettings();
  } catch (error) {
    console.error('Fulfillment: impossible de lire les paramètres NA:', error);
  }

  if (!settings?.na_integration_enabled || settings.na_auto_fulfill === false) {
    await withAdminContext((client) =>
      client.query(
        `update public.orders set supplier_fulfillment_status = 'none'
          where id = $1 and supplier_fulfillment_status = 'pending'`,
        [orderId]
      )
    ).catch(() => undefined);
    return;
  }

  try {
    const result = await fulfillNeumaticosAndresOrder(admin, orderId, settings);
    if (result.ok) {
      await withAdminContext((client) =>
        client.query(
          `update public.orders
              set supplier_fulfillment_status = case when $2 then 'none' else 'submitted' end,
                  supplier_fulfillment_attempts = coalesce(supplier_fulfillment_attempts, 0) + 1,
                  supplier_fulfillment_last_error = null
            where id = $1`,
          [orderId, Boolean(result.skipped)]
        )
      );
      return;
    }
    await recordFulfillmentFailure(orderId, result.error || 'Fulfillment failed');
  } catch (error) {
    await recordFulfillmentFailure(orderId, error instanceof Error ? error.message : String(error));
  }
}

async function recordFulfillmentFailure(orderId: string, message: string) {
  console.error(`Neumáticos Andrés fulfillment failed for order ${orderId}:`, message);
  try {
    await withAdminContext(async (client) => {
      await client.query(
        `update public.orders
            set supplier_fulfillment_status = 'error',
                supplier_fulfillment_attempts = coalesce(supplier_fulfillment_attempts, 0) + 1,
                supplier_fulfillment_last_error = left($2, 1000)
          where id = $1`,
        [orderId, message]
      );
      await client.query(
        `insert into public.supplier_orders (order_id, integration, customer_order_id, status, error_message)
         values ($1, $2, $3, 'error', left($4, 1000))
         on conflict (order_id, integration) do update
           set status = case when public.supplier_orders.status in ('submitted', 'confirmed') then public.supplier_orders.status else 'error' end,
               error_message = excluded.error_message,
               updated_at = now()`,
        [orderId, NEUMATICOS_ANDRES_SUPPLIER, buildCustomerOrderId(orderId), message]
      );
    });
  } catch (error) {
    console.error('Fulfillment: impossible d’enregistrer l’échec:', error);
  }
}

/**
 * Reprise des envois fournisseur en attente/en erreur (appelé par le cron).
 * Ne réessaie que les commandes payées, avec moins de MAX_FULFILLMENT_ATTEMPTS tentatives.
 */
export async function retryPendingFulfillments(admin: DbClient): Promise<{ retried: number; ok: number; failed: number }> {
  const { rows } = await withAdminContext((client) =>
    client.query<{ id: string }>(
      `select id from public.orders
        where payment_status = 'paid'
          and supplier_fulfillment_status in ('pending', 'error')
          and coalesce(supplier_fulfillment_attempts, 0) < $1
          and created_at > now() - interval '14 days'
        order by created_at asc
        limit 25`,
      [MAX_FULFILLMENT_ATTEMPTS]
    )
  );

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    await attemptSupplierFulfillment(admin, row.id);
    const { rows: after } = await withAdminContext((client) =>
      client.query<{ supplier_fulfillment_status: string | null }>(
        `select supplier_fulfillment_status from public.orders where id = $1`,
        [row.id]
      )
    );
    if (after[0]?.supplier_fulfillment_status === 'error') failed += 1;
    else ok += 1;
  }
  return { retried: rows.length, ok, failed };
}

/**
 * Réclame un événement webhook AVANT traitement (INSERT ... ON CONFLICT DO NOTHING).
 * Retourne `claimed=false` si un autre worker l'a déjà pris. En cas d'échec du
 * traitement, appeler `releaseWebhookEvent` pour permettre le retry Stripe.
 */
export async function claimWebhookEvent(
  _supabase: DbClient,
  eventId: string,
  eventType: string
): Promise<{ claimed: boolean; unsupported?: boolean }> {
  try {
    const { rowCount } = await withAdminContext((client) =>
      client.query(
        `insert into public.stripe_webhook_events (id, type) values ($1, $2)
         on conflict (id) do nothing`,
        [eventId, eventType]
      )
    );
    return { claimed: (rowCount ?? 0) > 0 };
  } catch (error) {
    const msg = (error instanceof Error ? error.message : '').toLowerCase();
    if (msg.includes('stripe_webhook_events') && (msg.includes('does not exist') || msg.includes('42p01'))) {
      console.error('stripe_webhook_events absente — appliquez les migrations (scripts/db-harden.sh).');
      return { claimed: true, unsupported: true };
    }
    console.warn('stripe_webhook_events insert warning:', error);
    return { claimed: true, unsupported: true };
  }
}

export async function releaseWebhookEvent(eventId: string): Promise<void> {
  try {
    await withAdminContext((client) =>
      client.query(`delete from public.stripe_webhook_events where id = $1`, [eventId])
    );
  } catch (error) {
    console.warn('releaseWebhookEvent:', error);
  }
}
