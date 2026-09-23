export type CheckoutOperation = 'health' | 'create_session' | 'track_start' | 'verify_session' | 'activation_status' | 'refresh_user';
export type CheckoutStatus = 'started' | 'succeeded' | 'failed' | 'unavailable';
export type CheckoutErrorCode = 'HTTP' | 'NETWORK' | 'INVALID_PAYLOAD' | 'UNAVAILABLE' | 'UNKNOWN';

export interface CheckoutDiagnostic {
  operation: CheckoutOperation;
  status: CheckoutStatus;
  code?: CheckoutErrorCode;
  httpStatus?: number;
  retryable?: boolean;
  hasSessionId?: boolean;
  hasCheckoutUrl?: boolean;
  itemCount?: number;
  sessionCount?: number;
  totalCents?: number;
}

const OPERATIONS = new Set<CheckoutOperation>(['health', 'create_session', 'track_start', 'verify_session', 'activation_status', 'refresh_user']);
const STATUSES = new Set<CheckoutStatus>(['started', 'succeeded', 'failed', 'unavailable']);
const CODES = new Set<CheckoutErrorCode>(['HTTP', 'NETWORK', 'INVALID_PAYLOAD', 'UNAVAILABLE', 'UNKNOWN']);
const finiteInt = (value: unknown, min = 0): number | undefined => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min ? value : undefined
);

export const toCheckoutDiagnostic = (value: Partial<CheckoutDiagnostic>): CheckoutDiagnostic => {
  const operation = OPERATIONS.has(value.operation as CheckoutOperation) ? value.operation as CheckoutOperation : 'create_session';
  const status = STATUSES.has(value.status as CheckoutStatus) ? value.status as CheckoutStatus : 'failed';
  const code = CODES.has(value.code as CheckoutErrorCode) ? value.code as CheckoutErrorCode : undefined;
  const diagnostic: CheckoutDiagnostic = { operation, status };
  if (code) diagnostic.code = code;
  const httpStatus = finiteInt(value.httpStatus, 100);
  if (httpStatus !== undefined && httpStatus <= 599) diagnostic.httpStatus = httpStatus;
  if (typeof value.retryable === 'boolean') diagnostic.retryable = value.retryable;
  if (typeof value.hasSessionId === 'boolean') diagnostic.hasSessionId = value.hasSessionId;
  if (typeof value.hasCheckoutUrl === 'boolean') diagnostic.hasCheckoutUrl = value.hasCheckoutUrl;
  const itemCount = finiteInt(value.itemCount);
  if (itemCount !== undefined) diagnostic.itemCount = itemCount;
  const sessionCount = finiteInt(value.sessionCount);
  if (sessionCount !== undefined) diagnostic.sessionCount = sessionCount;
  const totalCents = finiteInt(value.totalCents);
  if (totalCents !== undefined) diagnostic.totalCents = totalCents;
  return diagnostic;
};

export const diagnosticFromUnknownError = (operation: CheckoutOperation, error: unknown): CheckoutDiagnostic => {
  const candidate = error as { response?: { status?: unknown }; request?: unknown } | null;
  const status = typeof candidate?.response?.status === 'number' ? candidate.response.status : undefined;
  if (status !== undefined) {
    return toCheckoutDiagnostic({ operation, status: 'failed', code: 'HTTP', httpStatus: status, retryable: status >= 500 || status === 429 });
  }
  if (candidate?.request) return toCheckoutDiagnostic({ operation, status: 'failed', code: 'NETWORK', retryable: true });
  return toCheckoutDiagnostic({ operation, status: 'failed', code: 'UNKNOWN', retryable: true });
};
