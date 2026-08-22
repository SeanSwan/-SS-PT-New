/**
 * Wave 1 Slice 9 — modal focus contract
 * =====================================
 * The client mobile navigation drawer locked body scroll and closed on Escape,
 * but never contained Tab. A keyboard or screen-reader user could tab straight
 * out of the open drawer into the page behind it, with nothing bringing focus
 * back. These tests pin the contract the extracted hook now provides.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React, { useRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function Harness({ open, onEscape }: { open: boolean; onEscape?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, { onEscape });
  return (
    <div>
      <button type="button">outside-before</button>
      {open && (
        <div ref={ref} role="dialog" aria-modal tabIndex={-1}>
          <button type="button">first</button>
          <button type="button">middle</button>
          <button type="button">last</button>
        </div>
      )}
      <button type="button">outside-after</button>
    </div>
  );
}

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useFocusTrap', () => {
  it('moves focus into the container on open', async () => {
    render(<Harness open />);
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByText('first'));
    });
  });

  it('wraps Tab from the last element back to the first', async () => {
    const user = userEvent.setup();
    render(<Harness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    screen.getByText('last').focus();
    await user.tab();

    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('wraps Shift+Tab from the first element back to the last', async () => {
    const user = userEvent.setup();
    render(<Harness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    screen.getByText('first').focus();
    await user.tab({ shift: true });

    expect(document.activeElement).toBe(screen.getByText('last'));
  });

  it('never lands on an element outside the container', async () => {
    const user = userEvent.setup();
    render(<Harness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    // Walk further than there are focusables inside; focus must stay contained.
    for (let i = 0; i < 6; i += 1) await user.tab();

    expect(document.activeElement).not.toBe(screen.getByText('outside-before'));
    expect(document.activeElement).not.toBe(screen.getByText('outside-after'));
  });

  it('pulls focus back in if it somehow starts outside', async () => {
    const user = userEvent.setup();
    render(<Harness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    screen.getByText('outside-before').focus();
    await user.tab();

    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('invokes onEscape', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(<Harness open onEscape={onEscape} />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    await user.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the opener when it closes', async () => {
    const { rerender } = render(<Harness open={false} />);
    const opener = screen.getByText('outside-before');
    opener.focus();
    expect(document.activeElement).toBe(opener);

    rerender(<Harness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));

    rerender(<Harness open={false} />);

    expect(document.activeElement).toBe(opener);
  });

  it('does nothing while inactive', async () => {
    const user = userEvent.setup();
    render(<Harness open={false} />);

    screen.getByText('outside-before').focus();
    await user.tab();

    // Free traversal — the trap must not interfere when closed.
    expect(document.activeElement).toBe(screen.getByText('outside-after'));
  });
});
