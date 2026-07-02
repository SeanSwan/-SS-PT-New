import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  approvalResultMessage,
  createdClientHubRoute,
  safeProposalStatus,
  safeSummaryClient,
  safeSummaryDate,
  safeSummaryExerciseCount,
  terminalStatusMessage,
} from './CoachActionProposalCard.logic';

describe('CoachActionProposalCard extracted logic contract', () => {
  it('keeps terminal receipt copy deterministic by status and proposal type', () => {
    expect(terminalStatusMessage('APPLIED', 'workout_log')).toMatch(/already been applied/i);
    expect(terminalStatusMessage('REJECTED', 'client_onboarding')).toMatch(/already been rejected/i);
    expect(terminalStatusMessage('APPROVED', 'split_plan')).toMatch(/split plan approved/i);
    expect(terminalStatusMessage('PENDING', 'workout_log')).toBeNull();
  });

  it('keeps active approval success copy tied to the proposal type', () => {
    expect(approvalResultMessage('workout_log', { applied: true })).toContain('deterministic workout logger');
    expect(approvalResultMessage('nutrition_log', { applied: true })).toContain('Nutrition log');
    expect(approvalResultMessage('client_profile_coverage_update', { applied: true })).toContain('profile coverage update');
    expect(approvalResultMessage('client_profile_coverage_update', { applied: false })).toBe('Draft approved for deterministic review.');
  });

  it('routes created-client receipts back to the current dashboard role', () => {
    expect(createdClientHubRoute({ id: 88 }, '/dashboard/admin/coach-assistant'))
      .toBe('/dashboard/admin/client-management?clientId=88');
    expect(createdClientHubRoute({ id: 88 }, '/dashboard/trainer/coach-assistant'))
      .toBe('/dashboard/trainer/clients?clientId=88');
    expect(createdClientHubRoute({ id: 'bad' }, '/dashboard/trainer/coach-assistant')).toBeNull();
  });

  it('sanitizes summary fields before rendering visible proposal rows', () => {
    expect(safeSummaryClient({ clientId: 42, displayName: 'Private Name' })).toBe('#42');
    expect(safeSummaryClient({ displayName: 'Private Name' })).toBe('Needs review');
    expect(safeSummaryDate('2026-05-30')).toBe('2026-05-30');
    expect(safeSummaryDate('May 30, 2026')).toBe('Needs review');
    expect(safeSummaryExerciseCount(3)).toBe('3');
    expect(safeSummaryExerciseCount('unsafe')).toBeNull();
    expect(safeProposalStatus('UNEXPECTED' as never)).toBe('Needs review');
  });

  it('keeps the renderer capped and delegated to extracted logic', () => {
    const source = readFileSync(resolve(__dirname, 'CoachActionProposalCard.tsx'), 'utf8');

    expect(source).toContain("from './CoachActionProposalCard.logic'");
    expect(source).toContain("typeof window === 'undefined' ? null : window.location.pathname");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});