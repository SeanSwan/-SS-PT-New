/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Coach drawer laws (Slice 2, tests-first).   │
 * │ Zone 5: Coach is NOT a persistent dock — one purple entry   │
 * │ → ONE drawer. Tabs: Coach (terminal) · Reference (NASM      │
 * │ guide + learning toggle, LAZY — read-mostly docs never      │
 * │ mount until asked). Rides the Sheet primitive so focus      │
 * │ return / ESC / history laws come structurally.              │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 5 + §4.2.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CoachDrawer from './zones/CoachDrawer';

const Harness: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type='button' onClick={() => setOpen(true)}>Coach</button>
      <CoachDrawer
        open={open}
        onClose={() => setOpen(false)}
        coach={<div data-testid='coach-terminal'>terminal</div>}
        reference={<div data-testid='reference-content'>guide</div>}
      />
    </div>
  );
};

afterEach(cleanup);

describe('one drawer, two tabs', () => {
  it('opens on the Coach tab with the terminal mounted', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(screen.getByRole('dialog', { name: 'Swan Coach' })).toBeInTheDocument();
    expect(screen.getByTestId('coach-terminal')).toBeInTheDocument();
  });

  it('Reference content is LAZY — not in the DOM until its tab is selected', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(screen.queryByTestId('reference-content')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Reference' }));
    expect(screen.getByTestId('reference-content')).toBeInTheDocument();
    expect(screen.queryByTestId('coach-terminal')).toBeNull(); // one tab at a time

    fireEvent.click(screen.getByRole('tab', { name: 'Coach' }));
    expect(screen.getByTestId('coach-terminal')).toBeInTheDocument();
  });

  it('tabs carry aria-selected and live in a tablist', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(screen.getByRole('tablist', { name: 'Coach drawer sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Reference' })).toHaveAttribute('aria-selected', 'false');
  });

  it('ESC closes the drawer and focus returns to the opener (Sheet contract)', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Coach' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
