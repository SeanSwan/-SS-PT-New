/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Sheet primitive focus laws (Slice 0).       │
 * │ Anti-jump law 1 (Kimi Q3 verbatim): every sheet stores      │
 * │ activeElement on open, restores it on close, traps focus    │
 * │ while open, ESC closes. Law 4: sheets push ONE history      │
 * │ entry so mobile back closes the sheet, not the page; stage  │
 * │ changes push none (see useSessionStage — no history there). │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 anti-jump laws. │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Sheet from './primitives/Sheet';

const Harness: React.FC<{ onCloseSpy?: () => void }> = ({ onCloseSpy }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type='button' onClick={() => setOpen(true)}>Open the sheet</button>
      <Sheet
        open={open}
        onClose={() => { setOpen(false); onCloseSpy?.(); }}
        label='Test sheet'
        historyKey='test-sheet'
      >
        <button type='button'>First inside</button>
        <button type='button'>Second inside</button>
      </Sheet>
    </div>
  );
};

let pushStateSpy: ReturnType<typeof vi.spyOn>;
let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pushStateSpy = vi.spyOn(window.history, 'pushState');
  backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
});

afterEach(() => {
  pushStateSpy.mockRestore();
  backSpy.mockRestore();
  cleanup();
});

describe('Sheet — focus return + trap (anti-jump law 1)', () => {
  it('moves focus into the sheet on open and RESTORES it to the opener on close', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open the sheet' });
    opener.focus();
    fireEvent.click(opener);

    // Focus moved INTO the sheet (first focusable).
    expect(screen.getByRole('dialog', { name: 'Test sheet' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First inside' }));

    // ESC closes and focus returns to the opener.
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('traps Tab inside the sheet — wraps from last to first and Shift+Tab back', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the sheet' }));
    const first = screen.getByRole('button', { name: 'First inside' });
    const second = screen.getByRole('button', { name: 'Second inside' });

    second.focus();
    fireEvent.keyDown(second, { key: 'Tab' });
    expect(document.activeElement).toBe(first); // wrapped forward

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second); // wrapped backward
  });
});

describe('Sheet — history contract (anti-jump law 4)', () => {
  it('pushes exactly ONE history entry on open', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the sheet' }));
    const sheetPushes = pushStateSpy.mock.calls.filter(
      ([state]) => (state as { ssSheet?: string } | null)?.ssSheet === 'test-sheet',
    );
    expect(sheetPushes).toHaveLength(1);
  });

  it('browser back (popstate) closes the sheet WITHOUT a second history.back()', () => {
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the sheet' }));

    // Mobile back: the entry is popped by the browser — state no longer ours.
    fireEvent.popState(window, { state: null });
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(backSpy).not.toHaveBeenCalled(); // pop already consumed the entry
  });

  it('UI close (ESC) consumes its own history entry via history.back()', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the sheet' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
