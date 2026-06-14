export type FulfillmentStatus = 'pending_fulfillment' | 'fulfilled' | 'not_required';

export interface FulfillmentItem {
  orderId: number;
  orderNumber: string;
  orderItemId: number;
  orderDate: string | null;
  customer: { id: number | null; name: string; email: string | null };
  product: { id: number | null; name: string; itemType: string };
  variant: { id: number | null; label: string | null; sku: string | null; stockQuantity: number | null };
  quantity: number;
  price: number;
  subtotal: number;
  fulfillmentStatus: FulfillmentStatus;
  fulfillment: {
    mode: string;
    type: string;
    details: {
      recipientName?: string;
      phone?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      pickupWindow?: string;
      notes?: string;
    };
  };
}

export interface QueueResponse {
  items: FulfillmentItem[];
  stats: { pending: number; fulfilled: number; total: number };
}
