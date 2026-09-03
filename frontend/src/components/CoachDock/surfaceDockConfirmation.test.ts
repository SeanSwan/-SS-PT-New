/**
 * Card 1.3 — the surface docks confirm IN PLACE.
 *
 * The defect: `confirmation_required` was pushed as a text receipt with no
 * control and the comment "confirmations belong to the Coach Command Center".
 * A trainer standing in the planner had to leave the surface, re-find the
 * action, and approve it elsewhere — on a gym floor, that is the end of the
 * ≤2s voice loop this program exists to protect.
 *
 * These are structural assertions over the shipped source: the dead-end branch
 * is GONE, the dock hook surfaces a pending confirmation, and the dock renders
 * the one sheet. A jsdom render of the whole dock would need the planner's
 * entire provider tree; the behaviour of the sheet itself is covered by
 * ConfirmationSheet.test.tsx against the real component.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname);
const hook = readFileSync(path.join(DIR, 'useSurfaceCoachDock.ts'), 'utf8');
const dock = readFileSync(path.join(DIR, 'SurfaceCoachDock.tsx'), 'utf8');

describe('surface docks confirm in place', () => {
  it('the dead-end comment and its text-only receipt are GONE', () => {
    expect(hook).not.toContain('confirmations belong to the Coach Command Center');
  });

  it('confirmation_required opens the sheet instead of pushing a receipt', () => {
    const branch = hook.slice(hook.indexOf("result.type === 'confirmation_required'"));
    const untilReturn = branch.slice(0, branch.indexOf('return;'));
    expect(untilReturn).toContain('setPendingConfirmation');
    expect(untilReturn).not.toContain('pushReceipt');
  });

  it('the sheet receives the SERVER tier verdict, never a client-chosen one', () => {
    expect(hook).toContain('result.tier');
    expect(hook).toContain('result.physical');
    // No literal tier is invented in the dock beyond the defensive fallback.
    const invented = hook.match(/tier:\s*'(fire_and_forget|read_back|refusal)'/g);
    expect(invented).toBeNull();
  });

  it('a burned or expired approval re-issues from the ORIGINAL utterance, not a re-typed one', () => {
    expect(hook).toContain('sourceMessage');
    expect(hook).toContain('reissueConfirmation');
  });

  it('the dock renders the ONE sheet component', () => {
    expect(dock).toContain("import ConfirmationSheet from '../CoachConfirm/ConfirmationSheet'");
    expect(dock).toContain('<ConfirmationSheet');
    expect(dock).toContain('presentation="region"');
  });

  it('the dock passes the locked client so the chip can alarm on a cross-client action', () => {
    expect(dock).toContain('lockedClientId={lockedClientId}');
  });
});
