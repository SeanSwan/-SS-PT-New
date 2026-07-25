/**
 * progressProofStatusText tests
 * =============================
 *
 * Locks the shared client/admin progress-proof summary copy so dashboard
 * surfaces do not drift between raw chart counters and coaching language.
 */
import { describe, expect, it } from 'vitest';

import { getProgressProofStatusText } from './progressProofStatusText';

describe('getProgressProofStatusText', () => {
  it('separates empty proof, building proof, full proof, and unavailable feeds', () => {
    expect(getProgressProofStatusText(0, 0)).toBe(
      'No saved workout proof yet - log a workout to populate charts',
    );
    expect(getProgressProofStatusText(4, 0)).toBe(
      'Progress proof building - 4 of 15 charts populated',
    );
    expect(getProgressProofStatusText(15, 0)).toBe(
      'Full progress proof ready - 15 charts populated',
    );
    expect(getProgressProofStatusText(4, 2)).toBe(
      '4 of 15 charts populated - 2 feeds unavailable',
    );
  });

  it('clamps non-finite and out-of-range values to the 15-chart contract', () => {
    expect(getProgressProofStatusText(Number.NaN, 0)).toBe(
      'No saved workout proof yet - log a workout to populate charts',
    );
    expect(getProgressProofStatusText(99, 0)).toBe(
      'Full progress proof ready - 15 charts populated',
    );
    expect(getProgressProofStatusText(4, 99)).toBe(
      '4 of 15 charts populated - 15 feeds unavailable',
    );
  });
});
