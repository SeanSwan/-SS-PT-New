/**
 * Lane C focus-steal regression, at the real component boundary.
 *
 * The open effect used `[onClose]` as its dependency while every parent passes
 * a fresh inline arrow per render, so ANY parent re-render re-registered the
 * keydown handler AND called panelRef.current?.focus() again — yanking focus
 * out of whatever the coach was doing (the date input inside this very panel,
 * or a control elsewhere on the page). The fix focuses once on mount and reads
 * onClose through a ref; this test renders the REAL panel and re-renders the
 * parent the way the real page does (new inline closure each time).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SlotDetailPanel from './SlotDetailPanel';

const slot = {
  id: 33,
  sprintId: 1,
  status: 'generated',
  scheduledDate: '2026-09-14',
  dayType: 'lower_body',
  classFormat: '4x4_r2',
  classStyle: 'standard',
  usedDate: null,
  generatedClassData: { exercises: [{ exerciseName: 'Back Squat', board: 'main' }] },
} as never;

const renderPanel = (onClose: () => void) => render(
  <SlotDetailPanel
    slot={slot}
    sprintId={1}
    generationVersion={3}
    onClose={onClose}
    onRefresh={() => {}}
  />,
);

vi.mock('../../hooks/useSprintAPI', () => ({
  useSprintAPI: () => ({ confirmSlot: vi.fn(), regenerateSlot: vi.fn(), loading: false }),
}));

describe('SlotDetailPanel focus ownership', () => {
  it('keeps focus in the date input across parent re-renders (no focus steal)', () => {
    const { rerender } = renderPanel(() => {});

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    dateInput.focus();
    expect(document.activeElement).toBe(dateInput);

    // The real page re-renders with a brand-new inline onClose each time.
    for (let pass = 0; pass < 3; pass++) {
      rerender(
        <SlotDetailPanel
          slot={slot}
          sprintId={1}
          generationVersion={3}
          onClose={() => {}}
          onRefresh={() => {}}
        />,
      );
    }

    expect(document.activeElement).toBe(dateInput);
  });

  it('still focuses the panel once on open, and Escape reaches the LATEST onClose', () => {
    const onClose1 = vi.fn();
    const { rerender } = renderPanel(onClose1);

    expect(document.activeElement).not.toBe(document.body);

    const onClose2 = vi.fn();
    rerender(
      <SlotDetailPanel
        slot={slot}
        sprintId={1}
        generationVersion={3}
        onClose={onClose2}
        onRefresh={() => {}}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
  });

  it('tab trapping still reaches the confirm/regenerate controls', () => {
    renderPanel(() => {});
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    dateInput.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(dateInput);
    expect(screen.getByRole('dialog')).toContainElement(active);
  });
});
