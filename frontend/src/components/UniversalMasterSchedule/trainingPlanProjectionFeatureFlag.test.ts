/**
 * ============================================================================
 * FILE: trainingPlanProjectionFeatureFlag.test.ts
 * PURPOSE: Lock the fail-closed UMS projection build flag.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import { trainingPlanScheduleProjectionsEnabled } from './trainingPlanProjectionFeatureFlag';

describe('trainingPlanScheduleProjectionsEnabled', () => {
  it('enables only an explicit true value', () => {
    expect(trainingPlanScheduleProjectionsEnabled('true')).toBe(true);
    expect(trainingPlanScheduleProjectionsEnabled('TRUE')).toBe(true);
    expect(trainingPlanScheduleProjectionsEnabled('false')).toBe(false);
    expect(trainingPlanScheduleProjectionsEnabled('preview')).toBe(false);
    expect(trainingPlanScheduleProjectionsEnabled(undefined)).toBe(false);
  });
});