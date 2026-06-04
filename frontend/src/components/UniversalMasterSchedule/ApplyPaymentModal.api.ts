import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import apiService from '../../services/api.service';
import type {
  ClientNeedingPayment,
  ForceOverrideInput,
  LastPackageInfo,
  PaymentMethod,
  SavedCard,
  StorefrontPackage,
  StorefrontPackageWithStatus,
} from './ApplyPaymentModal.types';

type ApiResponse<T = any> = {
  data: T;
  status?: number;
};

export const fetchPaymentRecoveryClients = async (): Promise<ClientNeedingPayment[]> => {
  const response = await apiService.get('/api/sessions/deductions/clients-needing-payment');
  const result = response.data;

  if (result?.success === false) {
    throw new Error(result?.message || 'Failed to fetch clients.');
  }

  return (result.data || []).filter(
    (client: ClientNeedingPayment) => !isNonDeductingClientSource(client.clientSource)
  );
};

export const fetchActiveStorefrontPackages = async (): Promise<StorefrontPackage[]> => {
  const response = await apiService.get('/api/storefront');
  const result = response.data as {
    items?: StorefrontPackageWithStatus[];
    data?: { packages?: StorefrontPackageWithStatus[] };
  };
  const items = result.items || result.data?.packages || [];

  return items.filter((packageItem) => packageItem.isActive !== false);
};

export const fetchClientLastPackage = async (clientId: number): Promise<LastPackageInfo | null> => {
  const response = await apiService.get(`/api/sessions/deductions/client-last-package/${clientId}`);
  const result = response.data;

  return result?.success && result.data ? result.data : null;
};

export const fetchSavedCardsForClient = async (clientId: number): Promise<SavedCard[]> => {
  const response = await apiService.get(`/api/admin/charge-card/payment-methods/${clientId}`);
  const result = response.data;

  return result.success ? result.paymentMethods || [] : [];
};

export const applyManualSessionPayment = async (payload: {
  clientId: number;
  sessionsToAdd: number;
  paymentNote?: string;
}): Promise<ApiResponse> => {
  const response = await apiService.post('/api/sessions/deductions/apply-payment', {
    clientId: payload.clientId,
    sessionsToAdd: payload.sessionsToAdd,
    paymentNote: payload.paymentNote,
  });

  return response;
};

export const applyPackagePayment = async (payload: {
  clientId: number;
  storefrontItemId: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  adminNotes: string;
  idempotencyToken: string;
} & Partial<ForceOverrideInput>): Promise<ApiResponse> => {
  const response = await apiService.post('/api/sessions/deductions/apply-package-payment', payload, {
    validateStatus: (status) => status < 500
  });

  return response;
};

export const chargeSavedCard = async (payload: {
  clientId: number;
  storefrontItemId: number;
  paymentMethodId: string;
  idempotencyToken: string;
} & Partial<ForceOverrideInput>): Promise<ApiResponse> => {
  const response = await apiService.post('/api/admin/charge-card/charge', payload, {
    validateStatus: (status) => status < 500
  });

  return response;
};

export const attachStripeTestCard = async (clientId: number): Promise<ApiResponse> => {
  const response = await apiService.post('/api/admin/charge-card/test-card', {
    clientId
  });

  return response;
};

export const processSessionDeductions = async (): Promise<ApiResponse> => {
  const response = await apiService.post('/api/sessions/deductions/process');

  return response;
};
