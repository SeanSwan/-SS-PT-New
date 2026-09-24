/*
 * S3 — OpsRail: repair is live and honest, backup is visible-but-blocked.
 *
 * THE ASYMMETRY IS THE TEST. This component exists to make one control usable
 * and the other visibly withheld, and both halves can fail in their own way:
 *
 *   BACKUP STAYS BLOCKED. The mutation that proves this: enable the button and
 *   this goes red. It is asserted as disabled AND as carrying its reason through
 *   `aria-describedby`, because a disabled control with no explanation is
 *   indistinguishable from a bug — and the `title` attribute alone does not reach
 *   assistive tech.
 *
 *   REPAIR SHOWS THE COUNTS, NOT "DONE". The mutation: replace the counts block
 *   with a "Repair complete" string and these assertions fail. A repair that
 *   emptied 40 rows and one that changed nothing must not render identically.
 *
 *   A REFUSAL IS VERBATIM. A RUN_LOCKED error must reach the operator with the
 *   engine's own sentence — including the pid — rather than being rewritten into
 *   "could not repair".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpsRail, summariseRepair } from '../components/OpsRail';
import type { ConsoleDataAdapter } from '../adapters';

function harness(repair: () => Promise<{ repaired: number; built: number; emptied: number }>) {
  const fn = vi.fn(repair);
  const adapter = { repair: fn } as unknown as ConsoleDataAdapter;
  return { adapter, repair: fn };
}

describe('S3 OpsRail', () => {
  it('backup is VISIBLE BUT DISABLED, and says why in an accessible way', () => {
    const h = harness(async () => ({ repaired: 0, built: 0, emptied: 0 }));
    render(<OpsRail adapter={h.adapter} />);

    const backup = screen.getByTestId('backup-button');
    expect(backup).toBeDisabled();

    // The reason must be reachable without a pointer: aria-describedby, not title.
    const describedBy = backup.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const why = document.getElementById(describedBy!);
    expect(why).toBeTruthy();
    expect(why!.textContent).toMatch(/raw transcripts/i);
    expect(why!.textContent).toMatch(/A1-08|D4/);
  });

  it('repair is NOT disabled — the other half of the asymmetry', () => {
    const h = harness(async () => ({ repaired: 0, built: 0, emptied: 0 }));
    render(<OpsRail adapter={h.adapter} />);
    expect(screen.getByTestId('repair-button')).toBeEnabled();
  });

  it('shows the three engine counts, not a generic "complete"', async () => {
    const h = harness(async () => ({ repaired: 7, built: 3, emptied: 2 }));
    render(<OpsRail adapter={h.adapter} />);
    fireEvent.click(screen.getByTestId('repair-button'));

    const out = await screen.findByTestId('repair-result');
    expect(out.textContent).toContain('7');
    expect(out.textContent).toContain('3');
    expect(out.textContent).toContain('2');
    expect(out.textContent).toMatch(/rows reconciled/);
    expect(out.textContent).toMatch(/brains rebuilt/);
    expect(out.textContent).toMatch(/emptied/);
  });

  it('a repair that changed nothing says so, and is distinguishable from a real repair', async () => {
    const h = harness(async () => ({ repaired: 0, built: 0, emptied: 0 }));
    render(<OpsRail adapter={h.adapter} />);
    fireEvent.click(screen.getByTestId('repair-button'));

    const out = await screen.findByTestId('repair-result');
    expect(out.textContent).toContain('changed nothing');
  });

  it('a RUN_LOCKED refusal reaches the operator VERBATIM, pid included', async () => {
    const h = harness(async () => {
      throw new Error('store is locked by another run (lock_held, pid 4242 on host-a)');
    });
    render(<OpsRail adapter={h.adapter} />);
    fireEvent.click(screen.getByTestId('repair-button'));

    const err = await screen.findByTestId('repair-error');
    expect(err.textContent).toContain('pid 4242');
    expect(err.textContent).toContain('lock_held');
    expect(screen.queryByTestId('repair-result')).toBeNull();
  });

  it('re-reads the store after a repair, so the roster cannot show pre-repair truth', async () => {
    const onChanged = vi.fn(async () => {});
    const h = harness(async () => ({ repaired: 1, built: 1, emptied: 0 }));
    render(<OpsRail adapter={h.adapter} onChanged={onChanged} />);
    fireEvent.click(screen.getByTestId('repair-button'));

    await screen.findByTestId('repair-result');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-read when the repair was refused — nothing changed to re-read', async () => {
    const onChanged = vi.fn(async () => {});
    const h = harness(async () => { throw new Error('store is locked by another run'); });
    render(<OpsRail adapter={h.adapter} onChanged={onChanged} />);
    fireEvent.click(screen.getByTestId('repair-button'));

    await screen.findByTestId('repair-error');
    await waitFor(() => expect(h.repair).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe('S3 summariseRepair', () => {
  it('derives the sentence from the counts instead of asserting success', () => {
    expect(summariseRepair({ repaired: 2, built: 1, emptied: 0 })).toBe('2 state row(s) reconciled, 1 brain(s) rebuilt.');
    expect(summariseRepair({ repaired: 0, built: 0, emptied: 0 })).toBe('Repair ran and changed nothing.');
    expect(summariseRepair({ repaired: 0, built: 0, emptied: 4 })).toContain('4 emptied');
  });
});
