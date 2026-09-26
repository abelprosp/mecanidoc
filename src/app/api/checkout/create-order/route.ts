import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { withAdminContext } from '@/lib/db/pool';
import {
  buildQuote,
  normalizeDeliveryType,
  normalizeQuoteItems,
  QuoteError,
  validateContact,
} from '@/lib/checkout/quote';
import { rateLimit } from '@/lib/rate-limit';
import { emailVerificationRequired, isEmailConfirmed } from '@/lib/auth/email-verification';

/**
 * Cria a encomenda (orders + order_items) numa única transação a partir de
 * IDs/quantidades/opções. Todos os montantes são recalculados no servidor.
 * O pagamento é iniciado a seguir por /api/stripe/create-checkout-session com o
 * total gravado aqui.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Veuillez vous connecter pour commander.' }, { status: 401 });
  }

  const rl = rateLimit(`create-order:${session.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 });
  }

  // Opcional (REQUIRE_EMAIL_VERIFICATION=1): só contas com e-mail confirmado podem encomendar.
  if (emailVerificationRequired() && !(await isEmailConfirmed(session.id))) {
    return NextResponse.json(
      { ok: false, code: 'EMAIL_NOT_VERIFIED', error: 'Confirmez votre adresse e-mail avant de commander (lien envoyé à votre inscription).' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  const contactResult = validateContact(body.contact);
  if (!contactResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Veuillez corriger les champs indiqués.', fieldErrors: contactResult.fieldErrors },
      { status: 400 }
    );
  }
  const contact = contactResult.contact;

  try {
    const items = normalizeQuoteItems(body.items);
    const deliveryType = normalizeDeliveryType(body.deliveryType);
    const warranty = body.warranty !== false;

    const result = await withAdminContext(async (client) => {
      // Bloqueia as linhas de produto para que stock e preço não mudem entre o cálculo e a gravação.
      await client.query(
        `select id from public.products where id = any($1::uuid[]) for update`,
        [Array.from(new Set(items.map((i) => i.productId)))]
      );

      const quote = await buildQuote(client, { items, deliveryType, warranty, userId: session.id });
      const orderId = randomUUID();

      await client.query(
        `insert into public.orders (
           id, user_id, status, payment_status, payment_method, currency,
           subtotal_amount, tax_amount, discount_amount, installation_fee,
           delivery_type, delivery_fee, warranty_included, warranty_fee, total_amount,
           contact_name, contact_phone, contact_email,
           shipping_address, shipping_city, shipping_zip, shipping_country, notes,
           quote_snapshot
         ) values (
           $1, $2, 'pending', 'pending', 'stripe', $3,
           $4, $5, $6, $7,
           $8, $9, $10, $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19, $20,
           $21::jsonb
         )`,
        [
          orderId,
          session.id,
          quote.currency,
          quote.subtotal,
          quote.taxAmount,
          quote.discountAmount,
          quote.installationFee,
          quote.deliveryType,
          quote.deliveryFee,
          quote.warrantyIncluded,
          quote.warrantyFee,
          quote.total,
          `${contact.firstName} ${contact.lastName}`.trim(),
          contact.phone,
          contact.email,
          `${contact.address} ${contact.apartment || ''}`.trim(),
          contact.city,
          contact.zip,
          contact.country,
          [contact.company ? `Société : ${contact.company}` : '', contact.notes || ''].filter(Boolean).join('\n'),
          JSON.stringify({
            version: 1,
            createdAt: new Date().toISOString(),
            lines: quote.lines,
            settings: quote.settings,
            discountRate: quote.discountRate,
          }),
        ]
      );

      for (const line of quote.lines) {
        await client.query(
          `insert into public.order_items (
             order_id, product_id, product_name, quantity, unit_base_price, price, installation_price, line_total, garage_id
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orderId,
            line.productId,
            line.productName,
            line.quantity,
            line.unitBasePrice,
            line.unitPrice,
            line.installationPrice,
            line.lineTotal + line.installationTotal,
            line.garageId,
          ]
        );
      }

      return { orderId, quote };
    });

    return NextResponse.json({ ok: true, orderId: result.orderId, quote: result.quote });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code, details: error.details },
        { status: error.status }
      );
    }
    console.error('[checkout/create-order]', error);
    return NextResponse.json(
      { ok: false, error: 'Impossible de créer la commande pour le moment. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
