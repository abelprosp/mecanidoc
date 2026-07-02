import type { DbClient } from '@/lib/db/client';
import { getOrderStatusMany } from './client';
import { NEUMATICOS_ANDRES_SUPPLIER, type SyncTrackingResult } from './types';

const STATUS_BATCH = 15;

function mapSupplierStatusToOrderStatus(statusCode: string | null | undefined): string | null {
  const code = Number(statusCode);
  if (Number.isNaN(code)) return null;
  if (code >= 80) return 'cancelled';
  if (code >= 60) return 'delivered';
  if (code >= 30) return 'shipped';
  if (code >= 10) return 'paid';
  return null;
}

function supplierOrderIdFromParcel(parcel: Record<string, unknown>): string | null {
  const value =
    parcel['supplier-order-id'] || parcel['supplie-order-id'] || parcel['supplier_order_id'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function syncNeumaticosAndresTracking(
  admin: DbClient,
  options?: { orderIds?: string[] }
): Promise<SyncTrackingResult> {
  const logs: string[] = [];
  let shipmentsUpserted = 0;
  let ordersUpdated = 0;

  let query = admin
    .from('supplier_orders')
    .select('id, order_id, customer_order_id, supplier_order_ids, status')
    .eq('integration', NEUMATICOS_ANDRES_SUPPLIER)
    .in('status', ['submitted', 'confirmed', 'processing']);

  if (options?.orderIds?.length) {
    query = query.in('order_id', options.orderIds);
  }

  const { data: supplierOrders, error } = await query;
  if (error) throw error;

  const rows = supplierOrders || [];
  logs.push(`${rows.length} pedido(s) externo(s) a sincronizar.`);

  const lookupIds = new Set<string>();
  for (const row of rows) {
    lookupIds.add(row.customer_order_id);
    for (const id of row.supplier_order_ids || []) lookupIds.add(id);
  }

  const ids = Array.from(lookupIds).filter(Boolean);
  if (!ids.length) {
    return { ordersChecked: 0, shipmentsUpserted: 0, ordersUpdated: 0, logs };
  }

  const orderIdByLookup = new Map<string, string>();
  for (const row of rows) {
    orderIdByLookup.set(row.customer_order_id, row.order_id);
    for (const id of row.supplier_order_ids || []) orderIdByLookup.set(id, row.order_id);
  }

  for (let i = 0; i < ids.length; i += STATUS_BATCH) {
    const batch = ids.slice(i, i + STATUS_BATCH);
    try {
      const response = await getOrderStatusMany(batch);
      const entries = response['order-status-info'] || [];

      for (const entry of entries) {
        if (entry.success === 0) {
          logs.push(
            `Sem dados para ${entry['customer-order-id']}: ${entry.errors?.[0]?.['error-message'] || 'desconhecido'}`
          );
          continue;
        }

        const lookupKey = entry['customer-order-id'] || '';
        const orderId = orderIdByLookup.get(lookupKey);
        if (!orderId) continue;

        let bestStatus: string | null = null;
        let bestDeliveryDate: string | null = null;

        for (const parcel of entry.parcels || []) {
          const parcelRecord = parcel as Record<string, unknown>;
          const supplierOrderId = supplierOrderIdFromParcel(parcelRecord);
          const parcelNumber =
            typeof parcel['parcel-number'] === 'string' ? parcel['parcel-number'] : null;

          const shipmentPayload = {
            order_id: orderId,
            supplier_order_id: supplierOrderId,
            parcel_number: parcelNumber,
            carrier_service: parcel.service || null,
            tracking_url: parcel.tracking || null,
            estimated_delivery_date: parcel['estimated-delivery-date'] || null,
            date_shipped: parcel['date-shipped'] || null,
            status_code: parcel['status-code'] || null,
            status_message: parcel['status-message'] || null,
            status_date: parcel['status-date'] ? new Date(parcel['status-date']).toISOString() : null,
            raw_payload: parcel,
            updated_at: new Date().toISOString(),
          };

          const { data: existingShipment } = await admin
            .from('order_shipments')
            .select('id')
            .eq('order_id', orderId)
            .eq('parcel_number', parcelNumber || '')
            .eq('supplier_order_id', supplierOrderId || '')
            .maybeSingle();

          if (existingShipment?.id) {
            await admin.from('order_shipments').update(shipmentPayload).eq('id', existingShipment.id);
          } else {
            await admin.from('order_shipments').insert([shipmentPayload]);
          }
          shipmentsUpserted++;

          const mapped = mapSupplierStatusToOrderStatus(parcel['status-code']);
          if (mapped) bestStatus = mapped;
          if (parcel['estimated-delivery-date']) {
            bestDeliveryDate = parcel['estimated-delivery-date'];
          }
        }

        if (bestStatus) {
          const updatePayload: Record<string, unknown> = { status: bestStatus };
          if (bestDeliveryDate) updatePayload.estimated_delivery_date = bestDeliveryDate;
          await admin.from('orders').update(updatePayload).eq('id', orderId);
          ordersUpdated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logs.push(`Erro no lote de tracking ${i / STATUS_BATCH + 1}: ${msg}`);
    }
  }

  logs.push(
    `Tracking concluído: ${rows.length} pedido(s), ${shipmentsUpserted} envio(s), ${ordersUpdated} status atualizado(s).`
  );

  return {
    ordersChecked: rows.length,
    shipmentsUpserted,
    ordersUpdated,
    logs,
  };
}
