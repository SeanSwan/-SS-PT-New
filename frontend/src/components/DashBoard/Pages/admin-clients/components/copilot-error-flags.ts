/**
 * copilot-error-flags
 *
 * Purpose: Central error-code classification for the workout copilot UI.
 */

const RETRYABLE_ERROR_CODES = new Set([
  'AI_RATE_LIMITED',
  'AI_PII_LEAK',
  'AI_PARSE_ERROR',
  'AI_VALIDATION_ERROR',
]);

export interface CopilotErrorFlags {
  isConsentError: boolean;
  isWaiverError: boolean;
  isAssignmentError: boolean;
  isOverrideError: boolean;
  isRetryable: boolean;
}

export const getCopilotErrorFlags = (errorCode: string): CopilotErrorFlags => ({
  isConsentError: errorCode.startsWith('AI_CONSENT') || errorCode.startsWith('AI_WAIVER'),
  isWaiverError: errorCode.startsWith('AI_WAIVER'),
  isAssignmentError: errorCode === 'AI_ASSIGNMENT_DENIED',
  isOverrideError: errorCode === 'MISSING_OVERRIDE_REASON',
  isRetryable: RETRYABLE_ERROR_CODES.has(errorCode),
});
