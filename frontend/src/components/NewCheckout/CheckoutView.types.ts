/**
 * FILE: CheckoutView.types.ts
 * PURPOSE: Shared view-state types for the live paid checkout route.
 * LAST VALIDATED: 2026-06-09 via CheckoutView theme contract.
 */
import type { CheckoutFulfillmentDetails } from './CheckoutView.logic';

export interface CheckoutCustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface CheckoutState {
  isProcessing: boolean;
  error: string | null;
  success: string | null;
  customerInfo: CheckoutCustomerInfo;
  fulfillmentDetails: CheckoutFulfillmentDetails;
}
