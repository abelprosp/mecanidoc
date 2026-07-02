export const NEUMATICOS_ANDRES_SUPPLIER = 'neumaticos_andres';

export type NaApiError = {
  'error-code': number;
  'error-message': string;
};

export type NaScheduleDetail = {
  amount: number;
  'delivery-date'?: string;
  'warehouse-code'?: string;
};

export type NaStockArticle = {
  'product-id'?: string;
  ean?: string;
  amount?: number;
  price?: number;
  'schedule-details'?: NaScheduleDetail[];
  success?: number;
  errors?: NaApiError[];
};

export type NaGetStockResponse = {
  articles: NaStockArticle[];
  success: number;
  errors: NaApiError[];
};

export type NaCreateOrderItem = {
  'product-id': string;
  'product-amount': string | number;
  'product-price': string | number;
  'warehouse-code'?: string;
};

export type NaCreateOrderRequest = {
  'order-id': string;
  'purchase-order-id'?: string;
  'delivery-firstname'?: string;
  'delivery-lastname'?: string;
  'delivery-street'?: string;
  'delivery-number'?: string;
  'address-description'?: string;
  'full-delivery-address'?: string;
  'delivery-zip'?: string;
  'delivery-city'?: string;
  'delivery-province'?: string;
  'delivery-country'?: string;
  'delivery-phone-number'?: string;
  'delivery-email'?: string;
  consignee?: {
    identifier: string;
    type: number;
  };
  'test-mode': string | number;
  items: NaCreateOrderItem[];
};

export type NaOrderItemResponse = {
  'product-id'?: string;
  ean?: string;
  'product-amount'?: string | number;
  'product-price'?: string | number;
  'current-product-price'?: number;
  'order-ids'?: Array<{
    id: string;
    'product-amount': number;
    'warehouse-code'?: string;
    'estimated-delivery-date'?: string;
  }>;
  success?: number;
  errors?: NaApiError[];
};

export type NaCreateOrderResponse = {
  'order-ids': string[];
  'order-items': NaOrderItemResponse[];
  success: number;
  errors: NaApiError[];
};

export type NaParcel = {
  'supplier-order-id'?: string;
  'supplie-order-id'?: string;
  'estimated-delivery-date'?: string;
  'date-shipped'?: string;
  'parcel-number'?: string;
  service?: string;
  tracking?: string;
  'status-date'?: string;
  'status-code'?: string;
  'status-message'?: string;
};

export type NaTrackingInfo = {
  'customer-order-id'?: string;
  parcels?: NaParcel[];
  success?: number;
  errors?: NaApiError[];
};

export type NaTrackInfoResponse = {
  'tracking-info': NaTrackingInfo[];
  success: number;
  errors: NaApiError[];
};

export type NaOrderStatusInfo = {
  'customer-order-id'?: string;
  parcels?: NaParcel[];
  success?: number;
  errors?: NaApiError[];
};

export type NaOrderStatusResponse = {
  'order-status-info': NaOrderStatusInfo[];
  success: number;
  errors: NaApiError[];
};

export type NaIntegrationSettings = {
  na_integration_enabled?: boolean | null;
  na_auto_fulfill?: boolean | null;
  na_auto_sync_stock?: boolean | null;
  na_use_consignee?: boolean | null;
  na_consignee_identifier?: string | null;
  na_consignee_type?: number | null;
};

export type SyncStockResult = {
  updated: number;
  skipped: number;
  errors: number;
  logs: string[];
};

export type FulfillOrderResult = {
  ok: boolean;
  skipped?: boolean;
  supplierOrderIds?: string[];
  error?: string;
};

export type SyncTrackingResult = {
  ordersChecked: number;
  shipmentsUpserted: number;
  ordersUpdated: number;
  logs: string[];
};
