/**
 * ============================================================================
 * FILE: SprintPlannerPage.keyboard.test.tsx — R-H17 / H17, slice 1.
 *
 * THE REGISTER'S CRITERION (15-audit-findings-and-fix-register.md:65, row R-H17):
 *
 *   "Sprint cards, slots and dialogs support keyboard activation, focus
 *    containment/restoration, Escape and named errors"
 *
 * WHAT WAS MISSING, measured before anything was written: a keyword sweep of
 * `frontend/src/components/SprintPlanner/*` for `onKeyDown`, `Escape`, `focus()`,
 * `tabIndex` and `aria-pressed` returned ZERO hits. The card below is a styled
 * `div` (SprintCard = styled(Card)) carrying a bare `onClick`, so it is reachable
 * by mouse and by nothing else; the view tabs are real `<button>`s but publish no
 * selected state, so a screen reader cannot say which view is active.
 *
 * THIS FILE COVERS THE PAGE HALF OF THE ROW: card activation and tab semantics.
 * The dialog half (Escape, focus containment, focus restoration) is covered in
 * `SlotDetailPanel.test.tsx`, and the calendar/chip targets are explicitly NOT
 * covered here — see the receipt's H17 slice note for what remains.
 *
 * NOTE: `frontend/tsconfig.json` EXCLUDES `**\/*.test.ts(x)`, so `tsc` does not
 * type-check this file — the run is the only evidence.
 * ============================================================================
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listSprints: vi.fn(),
  getSprint: vi.fn(),
  generateSprint: vi.fn(),
}));

vi.mock('../../hooks/useSprintAPI', () => ({
  useSprintAPI: () => ({
    listSprints: mocks.listSprints,
    getSprint: mocks.getSprint,
    generateSprint: mocks.generateSprint,
  }),
}));

import SprintPlannerPage from './SprintPlannerPage';

const SPRINT = {
  id: 12,
  name: 'Synthetic Sprint',
  status: 'draft',
  startDate: '2026-03-02',
  endDate: '2026-05-24',
  durationWeeks: 12,
  classesPerWeek: 3,
  progressionStrategy: 'linear',
  totalClassesCompleted: 0,
  totalClassesPlanned: 36,
  weeks: [],
  classSlots: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listSprints.mockResolvedValue([SPRINT]);
  mocks.getSprint.mockResolvedValue({ ...SPRINT, weeks: [], classSlots: [] });
  mocks.generateSprint.mockResolvedValue(undefined);
});

describe('R-H17 — the sprint card is operable without a mouse', () => {
  it('exposes the card as a button and loads the sprint on Enter', async () => {
    render(<SprintPlannerPage />);

    const card = await screen.findByRole('button', { name: /Synthetic Sprint/i });
    // A card that is only a click target is invisible to assistive tech and
    // unreachable by Tab.
    expect(card).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(card, { key: 'Enter' });

    await waitFor(() => expect(mocks.getSprint).toHaveBeenCalledWith(12));
  });

  it('also activates on Space, the other key a button role promises', async () => {
    render(<SprintPlannerPage />);

    const card = await screen.findByRole('button', { name: /Synthetic Sprint/i });
    fireEvent.keyDown(card, { key: ' ' });

    await waitFor(() => expect(mocks.getSprint).toHaveBeenCalledWith(12));
  });

  it('does NOT activate for an unrelated key', async () => {
    render(<SprintPlannerPage />);

    const card = await screen.findByRole('button', { name: /Synthetic Sprint/i });
    fireEvent.keyDown(card, { key: 'a' });

    // A guard against "any keypress opens the sprint", which would be worse than
    // no keyboard support at all.
    expect(mocks.getSprint).not.toHaveBeenCalled();
  });
});

describe('R-H17 — the view tabs publish which one is selected', () => {
  // The view toggle lives in the DETAIL view, not the list, so these tests must open a sprint first.
  // Gating them on the list instead made them fail for the card's reason rather than their own — a
  // test that certifies nothing, caught by running it.
  const openDetail = async () => {
    render(<SprintPlannerPage />);
    const card = await screen.findByRole('button', { name: /Synthetic Sprint/i });
    fireEvent.click(card);
    return screen.findByRole('tab', { name: /timeline/i });
  };

  it('marks the active tab with aria-selected and the other as unselected', async () => {
    await openDetail();

    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /calendar/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('moves the selected state when the other tab is activated', async () => {
    await openDetail();

    fireEvent.click(screen.getByRole('tab', { name: /calendar/i }));

    expect(screen.getByRole('tab', { name: /calendar/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'false');
  });
});
