/**
 * Arc L / L4 — dictation degradation contract: a FAILED receipt is a tap-to-type chip
 * (focuses the always-present input), never a dead error. OK receipts stay non-interactive.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoggerDictationStrip from './LoggerDictationStrip';

const base = {
  active: true, listening: false, interim: '', text: '', setText: vi.fn(),
  submitting: false, send: vi.fn(), stopListening: vi.fn(),
};

describe('LoggerDictationStrip L4', () => {
  it('failed receipt is a tap-to-type button that focuses the input', () => {
    render(<LoggerDictationStrip {...base} receipt={{ ok: false, text: "Didn't catch that" }} />);
    const chip = screen.getByRole('button', { name: /didn't catch that — tap to type instead/i });
    fireEvent.click(chip);
    expect(screen.getByLabelText(/dictated log entry/i)).toHaveFocus();
  });

  it('ok receipt stays non-interactive', () => {
    render(<LoggerDictationStrip {...base} receipt={{ ok: true, text: 'Added Goblet Squat — 3×12' }} />);
    expect(screen.queryByRole('button', { name: /added goblet squat/i })).toBeNull();
  });
});
