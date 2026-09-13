/**
 * ============================================================================
 * FILE: SlotDetailModal.test.tsx — R-H17, the DIALOG half.
 *
 * THE REGISTER'S CRITERION (15-audit-findings-and-fix-register.md:65, row R-H17):
 *   "Sprint cards, slots and dialogs support keyboard activation, focus
 *    containment/restoration, Escape and named errors"
 *
 * WHAT THE SHELL WAS: `<ModalOverlay onClick={onClose} role="dialog" aria-modal="true">` wrapping
 * `<ModalContent>`. So the element announced as the dialog was the click-to-close BACKDROP; Escape did
 * nothing; and nothing contained or restored focus — Tab walked out into the page behind the dialog
 * and closing it dropped focus to `<body>`, losing a keyboard user's place in the list.
 *
 * THESE ARE BEHAVIOURAL TESTS. jsdom computes no accessibility tree beyond roles, so each one drives
 * a real key event and asserts the resulting FOCUS or the resulting state — not that an attribute
 * string exists in the source.
 *
 * VALID RED, not an import error: the suite was first run against the shell as it stood (the markup
 * moved verbatim into `SlotDetailModal`), so the component rendered and every test below failed on
 * behaviour — no Escape handling, no focus movement.
 * ============================================================================
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import SlotDetailModal from './SlotDetailModal';

/** A trigger OUTSIDE the dialog, so focus restoration has somewhere real to return to. */
const Harness = ({ onCloseSpy }: { onCloseSpy?: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open slot</button>
      <button type="button">Another page control</button>
      {open && (
        <SlotDetailModal
          label="Slot detail"
          onClose={() => { onCloseSpy?.(); setOpen(false); }}
        >
          <button type="button">First</button>
          <button type="button">Last</button>
        </SlotDetailModal>
      )}
    </div>
  );
};

/**
 * Open the dialog the way a browser does: a real click FOCUSES the button it lands on, and that
 * focused element is what the dialog must give focus back to. jsdom's `fireEvent.click` does not move
 * focus at all, so the trigger is focused explicitly first — without this the restoration test failed
 * for an environment reason rather than a behaviour one, which is exactly the kind of false signal
 * this suite exists to avoid.
 */
const openDialog = () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open slot' });
  trigger.focus();
  fireEvent.click(trigger);
  return screen.getByRole('dialog');
};

describe('R-H17 — the slot dialog is a dialog, not a backdrop with a role', () => {
  it('names itself and announces itself as modal', () => {
    const dialog = openDialog();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Slot detail');
    // The backdrop must NOT be the element carrying the dialog role: it is the thing that dismisses.
    expect(screen.getByRole('dialog')).not.toHaveClass('ModalOverlay');
  });

  it('moves focus INTO the dialog when it opens', () => {
    openDialog();

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('closes on Escape', () => {
    let closed = 0;
    render(<Harness onCloseSpy={() => { closed += 1; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open slot' }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(closed).toBe(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the trigger after closing, instead of dropping it to the body', () => {
    openDialog();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Open slot' })).toHaveFocus();
  });

  it('contains Tab at the end of the dialog', () => {
    openDialog();
    screen.getByRole('button', { name: 'Last' }).focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('contains Shift+Tab at the start of the dialog', () => {
    openDialog();
    screen.getByRole('button', { name: 'First' }).focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('does not steal Tab from the page once it is closed', () => {
    openDialog();
    fireEvent.keyDown(document, { key: 'Escape' });

    const pageControl = screen.getByRole('button', { name: 'Another page control' });
    pageControl.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    // No dialog is mounted, so nothing may move focus on its behalf.
    expect(pageControl).toHaveFocus();
  });
});
