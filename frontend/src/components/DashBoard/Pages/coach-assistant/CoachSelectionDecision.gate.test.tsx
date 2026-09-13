/**
 * ============================================================================
 * FILE: CoachSelectionDecision.gate.test.tsx
 * PURPOSE: the decision surface's busy policy — the F1 regression guard.
 * ============================================================================
 * WHY THIS FILE EXISTS. External hostile review (GLM 5.3, 2026-09-13) found the
 * gate used `busy={selection.phase !== 'decision'}`, which dead-locked the whole
 * Coach console behind a modal:
 *
 *   - `CoachSelectionDecision` renders whenever `pending` is non-null (`open`),
 *     regardless of phase.
 *   - Every FAILURE path in `decide()` (blocked-return, invalid/STALE, retired)
 *     patches only `phase`/`reason` and leaves `pending` set.
 *   - So on any failed decide the dialog stayed OPEN with `busy === true`, which
 *     disabled BOTH actions. The Backdrop has no click handler and there is no
 *     close button, so a pointer/touch operator had no exit at all; Escape merely
 *     retried the same failing call. One failed GET bricked the staff console
 *     until reload.
 *
 * The production fix narrows busy to the two in-flight phases, so a failure
 * re-enables both actions and "Discard draft" becomes a real exit.
 *
 * These tests FAIL against the old predicate: every non-'decision' phase below
 * would have both buttons disabled. That is the point — a guard that cannot fail
 * is not a guard.
 *
 * Deliberately dependency-free: it asserts the plain `disabled` DOM property
 * rather than a jest-dom matcher, so it cannot silently no-op if a matcher is
 * unavailable in the configured setup.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoachSelectionDecisionGate } from './CoachSelectionDecision';

type GateSelection = Parameters<typeof CoachSelectionDecisionGate>[0]['selection'];

const TICKET = { requestId: 'req-1', scopeToken: 'scope-1', targetUserId: 52 };

function selectionWith(phase: string, overrides: Partial<GateSelection> = {}): GateSelection {
  return {
    phase,
    pending: { ...TICKET },
    decide: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as GateSelection;
}

const returnButton = () => screen.getByRole('button', { name: /return to original/i }) as HTMLButtonElement;
const discardButton = () => screen.getByRole('button', { name: /discard draft/i }) as HTMLButtonElement;

const IN_FLIGHT = ['checking', 'committing'];
const SETTLED_OR_FAILED = ['decision', 'blocked-return', 'invalid', 'retired', 'unavailable', 'denied'];

describe('CoachSelectionDecisionGate — busy policy', () => {
  it.each(IN_FLIGHT)('disables BOTH actions while the decide is genuinely in flight (%s)', (phase) => {
    render(<CoachSelectionDecisionGate selection={selectionWith(phase)} currentLabel="Client #41" />);
    expect(returnButton().disabled).toBe(true);
    expect(discardButton().disabled).toBe(true);
  });

  it.each(SETTLED_OR_FAILED)(
    'keeps BOTH actions ENABLED in phase "%s" so a failed decide() cannot trap the operator',
    (phase) => {
      render(<CoachSelectionDecisionGate selection={selectionWith(phase)} currentLabel="Client #41" />);
      // The F1 regression: with `busy={phase !== 'decision'}` every one of these
      // phases disables both buttons while the dialog stays open.
      expect(returnButton().disabled).toBe(false);
      expect(discardButton().disabled).toBe(false);
    },
  );

  it('renders the dialog whenever a decision is pending, in every phase', () => {
    for (const phase of [...IN_FLIGHT, ...SETTLED_OR_FAILED]) {
      const { unmount } = render(<CoachSelectionDecisionGate selection={selectionWith(phase)} currentLabel="Client #41" />);
      expect(screen.getByTestId('coach-selection-decision')).toBeTruthy();
      unmount();
    }
  });

  it('renders nothing when there is no pending decision', () => {
    render(
      <CoachSelectionDecisionGate
        selection={selectionWith('decision', { pending: null })}
        currentLabel="Client #41"
      />,
    );
    expect(screen.queryByTestId('coach-selection-decision')).toBeNull();
  });

  it('Discard reaches decide() with the REAL ticket — the exit that must survive a blocked Return', () => {
    const decide = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachSelectionDecisionGate
        selection={selectionWith('blocked-return', { decide })}
        currentLabel="Client #41"
      />,
    );
    discardButton().click();
    expect(decide).toHaveBeenCalledWith('scope-1', 'req-1', 'discard');
  });

  it('Return reaches decide() with the REAL ticket', () => {
    const decide = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachSelectionDecisionGate
        selection={selectionWith('blocked-return', { decide })}
        currentLabel="Client #41"
      />,
    );
    returnButton().click();
    expect(decide).toHaveBeenCalledWith('scope-1', 'req-1', 'return');
  });

  it('a null ticket never calls decide — the buttons are inert rather than wrong', () => {
    const decide = vi.fn().mockResolvedValue(undefined);
    render(
      <CoachSelectionDecisionGate
        selection={selectionWith('decision', { pending: null, decide })}
        currentLabel="Client #41"
      />,
    );
    expect(decide).not.toHaveBeenCalled();
  });
});
