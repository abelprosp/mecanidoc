import type { DbClient } from '@/lib/db/client';
import { createOrder, getStockMany, pickBestSchedule } from './client';
import {
  buildCustomerOrderId,
  getNeumaticosAndresConfig,
  isIntegrationEnabled,
} from './config';
import { splitContactName, toAlpha2Country } from './country';
import {
  NEUMATICOS_ANDRES_SUPPLIER,
  type FulfillOrderResult,
  type NaCreateOrderItem,
  type NaIntegrationSettings,
} from './types';

type OrderRow = {
  id: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
  shipping_province?: string | null;
};

type OrderItemRow = {
  quantity: number;
  price: number;
  products: {
    id: string;
    name?: string | null;
    ean?: string | null;
    external_supplier?: string | null;
    external_product_id?: string | null;
    external_metadata?: Record<string, unknown> | null;
    base_price?: number | null;
  } | null;
};

function productLookupId(product: OrderItemRow['products']): string | null {
  if (!product) return null;
  return (product.ean || product.external_product_id || '').trim() || null;
}

export async function fulfillNeumaticosAndresOrder(
  admin: DbClient,
  orderId: string,
  settings?: NaIntegrationSettings | null
): Promise<FulfillOrderResult> {
  if (!getNeumaticosAndresConfig().isConfigured) {
    return { ok: false, error: 'Credenciais Neumáticos Andrés não configuradas.' };
  }

  if (settings && !isIntegrationEnabled(settings)) {
    return { ok: true, skipped: true };
  }

  const { data: existing } = await admin
    .from('supplier_orders')
    .select('id, status, supplier_order_ids')
    .eq('order_id', orderId)
    .eq('integration', NEUMATICOS_ANDRES_SUPPLIER)
    .maybeSingle();

  if (existing && ['submitted', 'confirmed'].includes(existing.status)) {
    return { ok: true, skipped: true, supplierOrderIds: existing.supplier_order_ids || [] };
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(
      'id, contact_name, contact_phone, contact_email, shipping_address, shipping_city, shipping_zip, shipping_country, shipping_province'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message || 'Pedido não encontrado.' };
  }

  const { data: items, error: itemsError } = await admin
    .from('order_items')
    .select(
      `
      quantity,
      price,
      products (
        id,
        name,
        ean,
        external_supplier,
        external_product_id,
        external_metadata,
        base_price
      )
    `
    )
    .eq('order_id', orderId);

  if (itemsError) {
    return { ok: false, error: itemsError.message };
  }

  const naItems = (items as OrderItemRow[] | null)?.filter(
    (item) => item.products?.external_supplier === NEUMATICOS_ANDRES_SUPPLIER
  );

  if (!naItems?.length) {
    return { ok: true, skipped: true };
  }

  const lookupIds = naItems
    .map((item) => productLookupId(item.products))
    .filter((id): id is string => Boolean(id));

  if (lookupIds.length !== naItems.length) {
    return { ok: false, error: 'Alguns produtos não têm EAN ou ID externo configurado.' };
  }

  const stockResponse = await getStockMany(lookupIds, order.shipping_zip || undefined);
  const orderItemsPayload: NaCreateOrderItem[] = [];
  let estimatedDeliveryDate: string | undefined;

  for (const item of naItems) {
    const lookupId = productLookupId(item.products)!;
    const article = stockResponse.articles?.find(
      (a) => a.ean === lookupId || a['product-id'] === lookupId
    );

    if (!article || article.success === 0) {
      const msg = article?.errors?.[0]?.['error-message'] || 'Artigo não encontrado';
      return { ok: false, error: `${lookupId}: ${msg}` };
    }

    if (Number(article.amount || 0) < item.quantity) {
      return { ok: false, error: `${lookupId}: stock insuficiente (${article.amount} disponível).` };
    }

    const metadata = item.products?.external_metadata || {};
    const schedule = pickBestSchedule(article['schedule-details'], item.quantity);
    const warehouseCode =
      (metadata.warehouse_code as string | undefined) || schedule.warehouseCode;
    const unitPrice = Number(article.price ?? item.products?.base_price ?? item.price);

    if (schedule.deliveryDate) {
      if (!estimatedDeliveryDate || schedule.deliveryDate < estimatedDeliveryDate) {
        estimatedDeliveryDate = schedule.deliveryDate;
      }
    }

    const payloadItem: NaCreateOrderItem = {
      'product-id': lookupId,
      'product-amount': item.quantity,
      'product-price': unitPrice,
    };
    if (warehouseCode) payloadItem['warehouse-code'] = warehouseCode;
    orderItemsPayload.push(payloadItem);
  }

  const customerOrderId = buildCustomerOrderId(order.id);
  const config = getNeumaticosAndresConfig();
  const { firstName, lastName } = splitContactName(order.contact_name);

  const requestPayload: Record<string, unknown> = {
    'order-id': customerOrderId,
    'purchase-order-id': order.id,
    'test-mode': config.testMode ? '1' : '0',
    items: orderItemsPayload,
  };

  if (settings?.na_use_consignee && settings.na_consignee_identifier) {
    requestPayload.consignee = {
      identifier: settings.na_consignee_identifier,
      type: settings.na_consignee_type === 2 ? 2 : 1,
    };
  } else {
    Object.assign(requestPayload, buildDeliveryAddress(order));
    requestPayload['delivery-firstname'] = firstName;
    requestPayload['delivery-lastname'] = lastName;
    requestPayload['delivery-phone-number'] = (order.contact_phone || '').slice(0, 15);
    requestPayload['delivery-email'] = (order.contact_email || '').slice(0, 300);
  }

  const response = await createOrder(requestPayload as never);

  if (response.success !== 1) {
    const err = response.errors?.[0]?.['error-message'] || 'Falha ao criar pedido no fornecedor.';
    await upsertSupplierOrder(admin, {
      orderId,
      customerOrderId,
      status: 'error',
      errorMessage: err,
      requestPayload,
      responsePayload: response,
    });
    await admin.from('orders').update({ supplier_fulfillment_status: 'error' }).eq('id', orderId);
    return { ok: false, error: err };
  }

  const supplierOrderIds = response['order-ids'] || [];
  await upsertSupplierOrder(admin, {
    orderId,
    customerOrderId,
    status: 'submitted',
    supplierOrderIds,
    requestPayload,
    responsePayload: response,
  });

  await admin
    .from('orders')
    .update({
      supplier_fulfillment_status: 'submitted',
      estimated_delivery_date: estimatedDeliveryDate || null,
    })
    .eq('id', orderId);

  return { ok: true, supplierOrderIds };
}

function buildDeliveryAddress(order: OrderRow) {
  return {
    'full-delivery-address': (order.shipping_address || 'Adresse non renseignee').slice(0, 80),
    'delivery-zip': (order.shipping_zip || '').slice(0, 8),
    'delivery-city': (order.shipping_city || '').slice(0, 25),
    'delivery-province': (order.shipping_province || order.shipping_city || '').slice(0, 20),
    'delivery-country': toAlpha2Country(order.shipping_country),
  };
}

async function upsertSupplierOrder(
  admin: DbClient,
  input: {
    orderId: string;
    customerOrderId: string;
    status: string;
    supplierOrderIds?: string[];
    errorMessage?: string;
    requestPayload: unknown;
    responsePayload: unknown;
  }
) {
  const payload = {
    order_id: input.orderId,
    integration: NEUMATICOS_ANDRES_SUPPLIER,
    customer_order_id: input.customerOrderId,
    supplier_order_ids: input.supplierOrderIds || [],
    status: input.status,
    error_message: input.errorMessage || null,
    request_payload: input.requestPayload,
    response_payload: input.responsePayload,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from('supplier_orders')
    .select('id')
    .eq('order_id', input.orderId)
    .eq('integration', NEUMATICOS_ANDRES_SUPPLIER)
    .maybeSingle();

  if (existing?.id) {
    await admin.from('supplier_orders').update(payload).eq('id', existing.id);
  } else {
    await admin.from('supplier_orders').insert([payload]);
  }
}
