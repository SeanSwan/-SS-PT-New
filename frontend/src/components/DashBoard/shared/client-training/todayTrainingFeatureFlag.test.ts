/**
 * ============================================================================
 * FILE: todayTrainingFeatureFlag.test.ts
 * PURPOSE: Lock explicit enable and fail-closed rollback values.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises the build-flag normalizer without depending on Vite runtime state.
 * HOW IT FITS IN THE APP: Guards the canonical client Today rollout before release.
 * KEY DECISIONS: Assertions use public state and source contracts, never private data.
 * NASM PROTOCOL CONTEXT: Verifies presentation and routing truth, not prescriptions.
 */
import { describe, expect, it } from 'vitest';
import { clientTodayTrainingModuleEnabled } from './todayTrainingFeatureFlag';

describe('clientTodayTrainingModuleEnabled', () => {
  it('fails closed when the build flag is absent or malformed', () => {
    expect(clientTodayTrainingModuleEnabled(undefined)).toBe(false);
    expect(clientTodayTrainingModuleEnabled('preview')).toBe(false);
  });

  it('enables only explicit true and rolls back on false', () => {
    expect(clientTodayTrainingModuleEnabled('true')).toBe(true);
    expect(clientTodayTrainingModuleEnabled('TRUE')).toBe(true);
    expect(clientTodayTrainingModuleEnabled('false')).toBe(false);
  });
});
