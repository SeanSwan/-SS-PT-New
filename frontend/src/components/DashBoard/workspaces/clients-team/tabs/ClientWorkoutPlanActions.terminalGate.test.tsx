/**
 * Terminal plan transitions must be GATED, not merely decorated.
 *
 * Archive and Mark-complete used to sit behind window.confirm. Replacing that
 * with a branded dialog is only an improvement if the dialog actually holds
 * the action back — a conversion that renders a dialog *and* fires the
 * lifecycle callback immediately would satisfy every source-grep contract in
 * the repo while being strictly WORSE than the browser prompt it replaced:
 * an irreversible transition with no confirmation at all.
 *
 * Source greps cannot see that difference. This renders the component and
 * watches the callback.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlanActions from './ClientWorkoutPlanActions';
import type { ClientPlanSummary } from './ClientWorkoutPlansPanel.types';

const plan = {
  id: 'plan-1',
  name: 'Foundation Block',
  status: 'active',
  goal: 'Strength',
  horizonKey: 'quarter',
  horizonLabel: 'Quarter',
  contentRevision: 2,
  currentWeek: 1,
  currentDay: 1,
} as unknown as ClientPlanSummary;

const renderActions = (onLifecycle: ReturnType<typeof vi.fn>) =>
  render(
    <ClientWorkoutPlanActions
      expanded={false}
      openingPdfId={null}
      plan={plan}
      onLifecycle={onLifecycle}
      onOpenPdf={vi.fn()}
      onToggleDetails={vi.fn()}
    />,
  );

describe('terminal lifecycle confirmation gate', () => {
  it('does not archive on the menu click alone', () => {
    const onLifecycle = vi.fn();
    renderActions(onLifecycle);

    fireEvent.click(screen.getByRole('button', { name: /archive plan/i }));

    // The whole point: the click opens a question, it does not perform the act.
    expect(onLifecycle).not.toHaveBeenCalled();
    expect(screen.getByText(/leave the active library/i)).toBeInTheDocument();
  });

  it('performs the archive only after the dialog is confirmed', () => {
    const onLifecycle = vi.fn();
    renderActions(onLifecycle);

    fireEvent.click(screen.getByRole('button', { name: /archive plan/i }));
    // Scoped to the dialog on purpose: the menu item shares this accessible
    // name, so an unscoped query would pass by clicking the trigger twice and
    // prove nothing about the dialog's confirm button.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive plan' }));

    expect(onLifecycle).toHaveBeenCalledTimes(1);
    expect(onLifecycle).toHaveBeenCalledWith(plan, 'archive');
  });

  it('abandons the archive when the dialog is cancelled', () => {
    const onLifecycle = vi.fn();
    renderActions(onLifecycle);

    fireEvent.click(screen.getByRole('button', { name: /archive plan/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

    expect(onLifecycle).not.toHaveBeenCalled();
  });

  it('carries the action through, so complete cannot archive by mistake', () => {
    // Both terminal transitions share one dialog. If the pending action were
    // dropped or defaulted, "Mark complete" would silently archive the plan —
    // a destructive off-by-one that the copy alone would not reveal.
    const onLifecycle = vi.fn();
    renderActions(onLifecycle);

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark complete' }));

    expect(onLifecycle).toHaveBeenCalledWith(plan, 'complete');
  });
});
