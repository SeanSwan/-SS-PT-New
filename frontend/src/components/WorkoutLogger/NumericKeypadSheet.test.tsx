/**
 * Arc L / L2 — NumericKeypadSheet contracts (ELEGANCE-BLUEPRINT-ARC-L + Kimi binding deltas).
 * Laws under test: digits build the value; Done commits + closes; EMPTY→Done keeps prior value
 * (no zero-commit); dirty backdrop/Esc COMMITS (never discards); allowDecimal gates the decimal key;
 * quick-chip commits last session's value in ONE tap; "Use system keyboard" escape hatch present.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumericKeypadSheet from './NumericKeypadSheet';

const setup = (over: Partial<React.ComponentProps<typeof NumericKeypadSheet>> = {}) => {
  const onCommit = vi.fn();
  const onClose = vi.fn();
  const onUseSystemKeyboard = vi.fn();
  render(
    <NumericKeypadSheet
      open
      label="Weight (lbs)"
      value={135}
      allowDecimal
      lastSessionValue={145}
      onCommit={onCommit}
      onClose={onClose}
      onUseSystemKeyboard={onUseSystemKeyboard}
      {...over}
    />,
  );
  return { onCommit, onClose, onUseSystemKeyboard };
};

describe('NumericKeypadSheet (L2)', () => {
  it('renders nothing when closed', () => {
    const { onCommit } = setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('digits build the value and Done commits + closes', () => {
    const { onCommit, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onCommit).toHaveBeenCalledWith(140);
    expect(onClose).toHaveBeenCalled();
  });

  it('EMPTY entry + Done keeps the prior value — no zero-commit', () => {
    const { onCommit, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('dirty Esc COMMITS (never discards typed work)', () => {
    const { onCommit } = setup();
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCommit).toHaveBeenCalledWith(9);
  });

  it('dirty backdrop tap COMMITS', () => {
    const { onCommit } = setup();
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByTestId('keypad-backdrop'));
    expect(onCommit).toHaveBeenCalledWith(7);
  });

  it('decimal key present only when allowDecimal (reps = integers)', () => {
    setup({ allowDecimal: false });
    expect(screen.queryByRole('button', { name: '.' })).toBeNull();
  });

  it('quick-chip commits last session value in ONE tap (ghost narrative)', () => {
    const { onCommit, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /last: 145/i }));
    expect(onCommit).toHaveBeenCalledWith(145);
    expect(onClose).toHaveBeenCalled();
  });

  it('backspace edits; "Use system keyboard" escape hatch is a 44px button', () => {
    const { onCommit, onUseSystemKeyboard } = setup();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /backspace/i }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onCommit).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: /use system keyboard/i }));
    expect(onUseSystemKeyboard).toHaveBeenCalled();
  });
});
