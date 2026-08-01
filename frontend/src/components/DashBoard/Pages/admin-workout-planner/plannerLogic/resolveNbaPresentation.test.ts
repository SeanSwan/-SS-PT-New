/**
 * resolveNbaPresentation.test.ts — S23 fence: the chip copy matches the
 * §4.5 6-row table, every verdict maps to its stated tap action, initials
 * only (no full names can enter the copy).
 */
import { describe, expect, it } from 'vitest';
import { resolveNbaPresentation } from './resolveNbaPresentation';

const initials = new Map([[7, 'SC']]);

describe('S23 resolveNbaPresentation', () => {
  it.each([
    [{ kind: 'session_due', clientId: 7 }, /Today: SC/, 'preselect_client'],
    [{ kind: 'deload_due', clientId: 7 }, /Deload week is next for SC/, 'preselect_multi_week'],
    [{ kind: 'plan_expired', clientId: 7 }, /SC's plan ended/, 'preselect_multi_week'],
    [{ kind: 'review_required', clientId: 7 }, /1 plan needs your review/, 'open_safety_review'],
    [{ kind: 'missing_plan', clientId: 7 }, /SC has no active plan/, 'preselect_multi_week'],
    [{ kind: 'pain_flag', clientId: 7 }, /pain flagged last session/, 'preselect_client'],
    [{ kind: 'pick_client' }, /Pick a client to start/, 'focus_client_picker'],
  ] as const)('maps %o to the table row', (nba, copyRe, actionKind) => {
    const view = resolveNbaPresentation(nba as never, initials);
    expect(view.copy).toMatch(copyRe);
    expect(view.action.kind).toBe(actionKind);
  });

  it('uses initials only — an unknown client renders a dash, never a name', () => {
    const view = resolveNbaPresentation({ kind: 'missing_plan', clientId: 99 }, initials);
    expect(view.copy).toBe('— has no active plan');
  });
});
