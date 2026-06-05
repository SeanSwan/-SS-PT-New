import { describe, expect, it } from 'vitest';
import {
  getLongHorizonApiError,
  getLongHorizonErrorFlags,
} from './longHorizonErrors';

describe('longHorizonErrors', () => {
  it('normalizes axios-style error payloads', () => {
    const result = getLongHorizonApiError({
      message: 'Request failed',
      response: {
        data: {
          code: 'AI_RATE_LIMITED',
          message: 'Rate limited',
          warnings: ['retry later'],
        },
      },
    });

    expect(result).toEqual({
      data: {
        code: 'AI_RATE_LIMITED',
        message: 'Rate limited',
        warnings: ['retry later'],
      },
      message: 'Request failed',
    });
  });

  it('classifies waiver, assignment, override, retryable, and invalid-draft states', () => {
    expect(getLongHorizonErrorFlags('AI_WAIVER_MISSING')).toMatchObject({
      isConsentError: true,
      isWaiverError: true,
    });
    expect(getLongHorizonErrorFlags('AI_ASSIGNMENT_DENIED').isAssignmentError).toBe(true);
    expect(getLongHorizonErrorFlags('MISSING_OVERRIDE_REASON').isOverrideReasonError).toBe(true);
    expect(getLongHorizonErrorFlags('AI_RATE_LIMITED').isRetryable).toBe(true);
    expect(getLongHorizonErrorFlags('APPROVED_DRAFT_INVALID').isApprovedDraftInvalid).toBe(true);
  });
});
