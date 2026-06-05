/**
 * longHorizonErrors
 *
 * Purpose: Centralizes long-horizon Swan Coach API error normalization and
 * branch flags so the render component does not duplicate business rules.
 */

export interface LongHorizonValidationError {
  code: string;
  field?: string;
  message: string;
}

export interface LongHorizonApiErrorPayload {
  code?: string;
  message?: string;
  errors?: LongHorizonValidationError[];
  warnings?: string[];
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: LongHorizonApiErrorPayload;
  };
}

export interface LongHorizonErrorFlags {
  isConsentError: boolean;
  isWaiverError: boolean;
  isAssignmentError: boolean;
  isOverrideReasonError: boolean;
  isRetryable: boolean;
  isApprovedDraftInvalid: boolean;
}

export const getLongHorizonApiError = (
  err: unknown,
): { data: LongHorizonApiErrorPayload; message?: string } => {
  const apiError = err as ApiErrorLike;
  return {
    data: apiError.response?.data || {},
    message: apiError.message,
  };
};

export const getLongHorizonErrorFlags = (errorCode: string): LongHorizonErrorFlags => ({
  isConsentError: errorCode?.startsWith('AI_CONSENT') || errorCode?.startsWith('AI_WAIVER'),
  isWaiverError: errorCode?.startsWith('AI_WAIVER'),
  isAssignmentError: errorCode === 'AI_ASSIGNMENT_DENIED',
  isOverrideReasonError: errorCode === 'MISSING_OVERRIDE_REASON',
  isRetryable: ['AI_RATE_LIMITED', 'AI_PII_LEAK', 'AI_PARSE_ERROR', 'AI_VALIDATION_ERROR'].includes(errorCode),
  isApprovedDraftInvalid: errorCode === 'APPROVED_DRAFT_INVALID',
});
