/**
 * ============================================================================
 * FILE: SlotDetailPanel.test.tsx — R-H20 (contract §6 lines 264, 265, 270).
 *
 * WHAT THIS LOCKS
 *   The server has recorded the work-interval decision since H20, but nothing showed it; the
 *   pure mapper being correct proves nothing about whether the panel MOUNTS it. §6 line 270 in
 *   particular requires a paced protocol's unsupported automatic progression to reach the
 *   trainer as a review reason — "a truthful capability limit, not an unresolved numeric
 *   policy" — so this drives the real component.
 *
 * NOTE: `frontend/tsconfig.json` EXCLUDES `**\/*.test.tsx`, so `tsc` does not type-check this
 * file — the run is the only evidence.
 * ============================================================================
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirmSlot: vi.fn(),
  regenerateSlot: vi.fn(),
  // Mutable so a test can simulate a REFUSAL: the hook holds the server's message in `error`.
  state: { error: null as string | null },
}));

vi.mock('../../hooks/useSprintAPI', () => ({
  useSprintAPI: () => ({
    confirmSlot: mocks.confirmSlot,
    regenerateSlot: mocks.regenerateSlot,
    loading: false,
    error: mocks.state.error,
  }),
}));

import SlotDetailPanel from './SlotDetailPanel';
import type { SprintClassSlot } from '../../hooks/useSprintAPI';

const slot = (overrides: Partial<SprintClassSlot> = {}): SprintClassSlot => ({
  id: 9,
  weekId: 3,
  sprintId: 12,
  dayOfWeek: 1,
  scheduledDate: '2026-03-02',
  dayType: 'full_body',
  classFormat: 'emom',
  classStyle: 'standard',
  status: 'generated',
  wasUsed: false,
  exerciseKeys: [],
  generatedClassData: { exercises: [], stations: [] },
  ...overrides,
});

const renderPanel = (overrides: Partial<SprintClassSlot> = {}) => render(
  <SlotDetailPanel
    slot={slot(overrides)}
    sprintId={12}
    onClose={() => {}}
    onRefresh={() => {}}
  />,
);

describe('SlotDetailPanel — the progression decision is DISPLAYED (§6 lines 265/270)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.error = null;
  });

  // Hostile review, round 114 F2: the panel's only write action swallowed every refusal. The hook
  // held the server's message in `error`; nothing rendered it, so USED_DATE_IN_FUTURE,
  // NOT_CONFIRMABLE_* and the taught-log conflict all looked like a dead button.
  it('RENDERS the refusal reason when the confirmation is rejected', () => {
    mocks.state.error = 'That date is in the future.';
    renderPanel();

    expect(screen.getByRole('alert').textContent).toContain('That date is in the future.');
  });

  it('renders NO error notice on a clean panel', () => {
    renderPanel();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  // Hostile review, round 115 F1 (HIGH): the notice originally lived INSIDE the confirm card, so a
  // refused `Regenerate Class` on a `planned` slot — where no confirm card renders at all — was
  // still silent. The regenerate button is offered for 'planned' as well as 'generated'.
  it('renders the refusal on a PLANNED slot, where no confirm card exists', () => {
    mocks.state.error = 'This slot cannot be regenerated.';
    renderPanel({ status: 'planned' });

    expect(screen.getByRole('alert').textContent).toContain('This slot cannot be regenerated.');
  });

  it('shows NO progression section for a class that carries no record', () => {
    renderPanel();

    expect(screen.queryByTestId('slot-progression')).toBeNull();
  });

  it('shows the paced-protocol review reason and the requested modifier', () => {
    renderPanel({
      generatedClassData: {
        exercises: [],
        stations: [],
        progression: {
          mode: 'manual_protocol',
          requestedModifier: 1.2,
          baseWorkSec: 60,
          appliedWorkSec: 60,
          applied: false,
          reason: 'unsupported_protocol',
        },
      },
    });

    const section = screen.getByTestId('slot-progression');
    expect(section).toHaveTextContent('Progression');
    expect(section).toHaveTextContent('kept exactly as prescribed');
    expect(section).toHaveTextContent('1.2× week modifier');
    expect(section).toHaveTextContent('60s (unchanged)');
    // The review prompt, not a silent no-op.
    expect(section).toHaveTextContent(/A trainer decides whether the prescribed protocol should change/);
  });

  it('shows the work seconds BEFORE and AFTER when progression applied', () => {
    renderPanel({
      generatedClassData: {
        exercises: [],
        stations: [],
        progression: {
          mode: 'scheduled_work_duration',
          requestedModifier: 1.4,
          baseWorkSec: 30,
          appliedWorkSec: 42,
          applied: true,
          reason: 'scheduled_work_duration',
          budgetStatus: 'within_budget',
        },
      },
    });

    const section = screen.getByTestId('slot-progression');
    expect(section).toHaveTextContent('30s → 42s');
    expect(section).not.toHaveTextContent(/A trainer decides/);
  });

  it('tells the trainer a class is NOT run-ready rather than presenting it as normal', () => {
    renderPanel({
      generatedClassData: {
        exercises: [],
        stations: [],
        progression: {
          requestedModifier: 1.4,
          baseWorkSec: 50,
          appliedWorkSec: 50,
          applied: false,
          reason: 'budget_failure',
          budgetStatus: 'budget_failure',
          certifiable: false,
        },
      },
    });

    const section = screen.getByTestId('slot-progression');
    expect(section).toHaveTextContent('Not run-ready');
    expect(section).toHaveTextContent(/not run-ready until the target duration/);
  });

  it('renders the SERVER’s provenance note, so the inference is on screen (round 103, F2)', () => {
    // The generator writes the compatibility inference into the class's persisted
    // `explanations`, and the ONLY reader of `generatedClassData` is this panel — which read
    // `exercises`, `stations` and `progression` and never `explanations`. §6 line 258's
    // "display this compatibility inference" was therefore met in the database and invisible
    // to the trainer.
    renderPanel({
      generatedClassData: {
        exercises: [],
        stations: [],
        progression: {
          requestedModifier: 1.05,
          baseWorkSec: 30,
          appliedWorkSec: 32,
          applied: true,
          reason: 'scheduled_work_duration',
        },
        explanations: [
          { type: 'format', message: 'Full group workout: 10 exercises x 2 rounds, 40s each' },
          { type: 'intensity', message: 'Week 2 intensity modifier 1.05 (from the undulating strategy).' },
        ],
      },
    });

    const section = screen.getByTestId('slot-progression');
    expect(section).toHaveTextContent('Week note');
    expect(section).toHaveTextContent('(from the undulating strategy)');
    // Only the intensity note — the panel is not a dump of every explanation.
    expect(section).not.toHaveTextContent('Full group workout');
  });

  it('still renders the rest of the class when there is no progression record', () => {
    // A regression guard on the surrounding panel: the new section must not swallow the
    // exercise list or the confirm action.
    renderPanel({
      generatedClassData: {
        exercises: [{ exerciseName: 'Goblet Squat', durationSec: 40 }],
        stations: [],
      },
    });

    expect(screen.getByText('Exercises (1)')).toBeInTheDocument();
    expect(screen.getByText('Goblet Squat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I taught this class/i })).toBeInTheDocument();
  });
});
