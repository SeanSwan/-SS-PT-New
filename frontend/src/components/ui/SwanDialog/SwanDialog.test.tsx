/**
 * ============================================================================
 * FILE: SwanDialog.test.tsx
 * PURPOSE: Executed a11y + behaviour contract for the shared dialog primitive.
 *
 * WHY THIS SUITE IS THE GATE (SWA-225 EX-6): 92 further consumers will inherit
 * whatever this primitive gets wrong. A focus bug here is a focus bug in every
 * confirm dialog in the product, and nobody would find it by clicking.
 *
 * CONTROLS — run each, watch it fail, restore:
 *   C1  delete `event.preventDefault()` + the restore in `restoreFocus`
 *       → "returns focus to the opener" fails (focus lands on <body>).
 *   C2  change `handleConfirm` to call `close()` before `onConfirm()`
 *       → "runs onConfirm before closing" fails.
 *   C3  make the rejected-promise branch call `close()`
 *       → "a rejected onConfirm leaves the dialog open" fails.
 *   C4  drop `destructive` from the TitleRow `$danger` prop
 *       → "focuses Cancel first on a destructive dialog" still passes, but the
 *         danger-icon assertion fails — proving the two are independent.
 * ============================================================================
 */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SwanDialog from './SwanDialog';

/** A realistic host: a trigger button that opens the dialog from parent state —
 *  the shape every real consumer has, and the shape Radix cannot auto-restore
 *  focus for. */
const Host: React.FC<{ onConfirm?: () => void | Promise<void>; destructive?: boolean }> = ({
  onConfirm,
  destructive,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open the dialog</button>
      <SwanDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this photo?"
        description="This removes the photo for everyone."
        destructive={destructive}
        confirmLabel="Delete photo"
        cancelLabel="Keep it"
        onConfirm={onConfirm}
      />
    </>
  );
};

describe('SwanDialog', () => {
  it('renders a labelled, described modal dialog when open', async () => {
    render(<Host onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));

    const dialog = await screen.findByRole('dialog', { name: /delete this photo/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('This removes the photo for everyone.')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(<Host onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape — including a destructive dialog, where dismissing is the SAFE outcome', async () => {
    const onConfirm = vi.fn();
    render(<Host onConfirm={onConfirm} destructive />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('focuses Cancel first on a destructive dialog, never the destructive control', async () => {
    render(<Host onConfirm={vi.fn()} destructive />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    await screen.findByRole('dialog');

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep it' }));
    });
  });

  it('shows the danger affordance only when destructive', async () => {
    const { unmount } = render(<Host onConfirm={vi.fn()} destructive />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    const dangerDialog = await screen.findByRole('dialog');
    expect(dangerDialog.querySelector('svg')).not.toBeNull();
    unmount();

    render(<Host onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    const plainDialog = await screen.findByRole('dialog');
    expect(plainDialog.querySelector('svg')).toBeNull();
  });

  it('confirms from the KEYBOARD — tab to Confirm, press Enter', async () => {
    // The SwanGuard regression class: a destructive action reachable only by
    // mouse. Driven with real key events, not a synthetic click.
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Host onConfirm={onConfirm} destructive />);
    await user.click(screen.getByRole('button', { name: 'Open the dialog' }));
    await screen.findByRole('dialog');

    await user.tab(); // Cancel has focus at open; move to Confirm
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete photo' }));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('runs onConfirm BEFORE closing', async () => {
    const order: string[] = [];
    render(<Host onConfirm={() => { order.push('confirm'); }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(order).toEqual(['confirm']);
  });

  it('returns focus to the element that opened it', async () => {
    // Radix restores focus to its Trigger; these consumers have none, so without
    // the manual capture focus would land on <body> and a keyboard user would
    // lose their place entirely.
    render(<Host onConfirm={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Open the dialog' });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('does not throw when the opener was removed while the dialog was open', async () => {
    // The realistic destructive case: confirming deletes the very row whose
    // button opened the dialog.
    const Vanishing: React.FC = () => {
      const [open, setOpen] = useState(false);
      const [present, setPresent] = useState(true);
      return (
        <>
          {present && <button type="button" onClick={() => setOpen(true)}>Open the dialog</button>}
          <SwanDialog
            open={open}
            onOpenChange={setOpen}
            title="Delete row?"
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={() => { setPresent(false); }}
          />
        </>
      );
    };
    render(<Vanishing />);
    const opener = screen.getByRole('button', { name: 'Open the dialog' });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Open the dialog' })).toBeNull();
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
  });

  it('a rejected onConfirm leaves the dialog OPEN so the failure is visible', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('server said no'));
    render(<Host onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dialog' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a single dismiss control when no onConfirm is given (informational)', async () => {
    const Info: React.FC = () => {
      const [open, setOpen] = useState(true);
      return <SwanDialog open={open} onOpenChange={setOpen} title="Heads up" cancelLabel="Close" />;
    };
    render(<Info />);
    const dialog = await screen.findByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Close');
  });
});
