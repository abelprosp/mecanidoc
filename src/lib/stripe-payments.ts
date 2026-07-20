import 'server-only';

import type { DbClient } from '@/lib/db/client';
import { fulfillNeumaticosAndresOrder } from '@/lib/neumaticos-andres/fulfill-order';
import { getNaIntegrationSettings } from '@/lib/neumaticos-andres/server-helpers';

export const STRIPE_CURRENCY = 'eur';
/** Montant minimum Stripe pour EUR (50 centimes). */
export const STRIPE_MIN_AMOUNT_CENTS = 50;

export type MarkOrderPaidOptions = {
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
};

export type MarkOrderPaidResult = {
  ok: boolean;
  alreadyPaid: boolean;
  updated: boolean;
  error?: string;
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

/**
 * Marque une commande comme payée de façon idempotente.
 * Ne déclenche le fulfillment fournisseur que lors de la première transition vers "paid".
 */
export async function markOrderPaid(
  supabase: DbClient,
  orderId: string,
  opts: MarkOrderPaidOptions = {}
): Promise<MarkOrderPaidResult> {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, payment_status, stripe_payment_intent_id, stripe_customer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError || !order) {
    return {
      ok: false,
      alreadyPaid: false,
      updated: false,
      error: fetchError?.message || 'Order not found',
    };
  }

  const alreadyPaid = order.payment_status === 'paid';
  const updatePayload: Record<string, unknown> = {};

  if (!alreadyPaid) {
    updatePayload.payment_status = 'paid';
    updatePayload.status = 'paid';
  }

  if (opts.paymentIntentId && !order.stripe_payment_intent_id) {
    updatePayload.stripe_payment_intent_id = opts.paymentIntentId;
  }
  if (opts.checkoutSessionId) {
    updatePayload.stripe_checkout_session_id = opts.checkoutSessionId;
  }
  if (opts.customerId && !order.stripe_customer_id) {
    updatePayload.stripe_customer_id = opts.customerId;
  }

  if (Object.keys(updatePayload).length > 0) {
    let { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    // Migration pas encore appliquée : retirer stripe_checkout_session_id et réessayer
    if (
      updateError &&
      opts.checkoutSessionId &&
      /stripe_checkout_session_id/i.test(updateError.message || '')
    ) {
      const { stripe_checkout_session_id: _removed, ...withoutSession } = updatePayload;
      if (Object.keys(withoutSession).length > 0) {
        const retry = await supabase.from('orders').update(withoutSession).eq('id', orderId);
        updateError = retry.error;
      } else {
        updateError = null;
      }
    }

    if (updateError) {
      return {
        ok: false,
        alreadyPaid,
        updated: false,
        error: updateError.message,
      };
    }
  }

  const becamePaid = !alreadyPaid;
  if (becamePaid) {
    await maybeFulfillOrder(supabase, orderId);
  }

  return { ok: true, alreadyPaid, updated: becamePaid || Object.keys(updatePayload).length > 0 };
}

async function maybeFulfillOrder(supabase: DbClient, orderId: string): Promise<void> {
  try {
    const naSettings = await getNaIntegrationSettings();
    if (naSettings?.na_integration_enabled && naSettings?.na_auto_fulfill !== false) {
      const result = await fulfillNeumaticosAndresOrder(supabase, orderId, naSettings);
      if (!result.ok && !result.skipped) {
        console.error('Neumáticos Andrés fulfillment failed:', result.error);
      }
    }
  } catch (fulfillError) {
    console.error('Neumáticos Andrés fulfillment error:', fulfillError);
  }
}

/**
 * Enregistre un événement webhook pour idempotence.
 * Retourne false si l'événement a déjà été traité (ou si l'insert échoue pour conflit).
 */
export async function claimWebhookEvent(
  supabase: DbClient,
  eventId: string,
  eventType: string
): Promise<{ claimed: boolean; unsupported?: boolean }> {
  const { error } = await supabase.from('stripe_webhook_events').insert({
    id: eventId,
    type: eventType,
  });

  if (!error) {
    return { claimed: true };
  }

  const msg = (error.message || '').toLowerCase();
  // Table absente (migration pas encore appliquée) → continuer sans bloquer
  if (
    msg.includes('stripe_webhook_events') &&
    (msg.includes('does not exist') || msg.includes('undefined_table') || msg.includes('42p01'))
  ) {
    return { claimed: true, unsupported: true };
  }

  // Conflit d'unicité = déjà traité
  if (
    msg.includes('duplicate') ||
    msg.includes('unique') ||
    msg.includes('23505') ||
    error.code === '23505'
  ) {
    return { claimed: false };
  }

  // Autre erreur DB : loguer mais ne pas bloquer le paiement
  console.warn('stripe_webhook_events insert warning:', error.message);
  return { claimed: true, unsupported: true };
}
