import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { getCopilotErrorFlags } from './copilot-error-flags';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

describe('getCopilotErrorFlags', () => {
  it('keeps error classification outside the copilot render shell', () => {
    expect(panelSource).toContain("from './copilot-error-flags'");
    expect(panelSource).not.toContain("errorCode?.startsWith('AI_CONSENT')");
    expect(panelSource).not.toContain("['AI_RATE_LIMITED', 'AI_PII_LEAK'");
  });

  it('classifies consent and waiver errors', () => {
    expect(getCopilotErrorFlags('AI_CONSENT_MISSING')).toMatchObject({
      isConsentError: true,
      isWaiverError: false,
    });

    expect(getCopilotErrorFlags('AI_WAIVER_VERSION_OUTDATED')).toMatchObject({
      isConsentError: true,
      isWaiverError: true,
    });
  });

  it('classifies assignment, override, and retryable errors', () => {
    expect(getCopilotErrorFlags('AI_ASSIGNMENT_DENIED')).toMatchObject({
      isAssignmentError: true,
      isRetryable: false,
    });
    expect(getCopilotErrorFlags('MISSING_OVERRIDE_REASON')).toMatchObject({
      isOverrideError: true,
      isRetryable: false,
    });
    expect(getCopilotErrorFlags('AI_RATE_LIMITED')).toMatchObject({
      isRetryable: true,
    });
  });

  it('treats empty and unknown codes as non-special errors', () => {
    expect(getCopilotErrorFlags('')).toEqual({
      isConsentError: false,
      isWaiverError: false,
      isAssignmentError: false,
      isOverrideError: false,
      isRetryable: false,
    });
    expect(getCopilotErrorFlags('AI_UNKNOWN')).toMatchObject({ isRetryable: false });
  });
});
