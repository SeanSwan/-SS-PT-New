/**
 * Arc L / L3 — rest-timer atmosphere contracts: Skip button, aria-live announcements,
 * voice adjust/skip via the existing AI event family (validated deltas, ack contract).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FloatingRestTimer from './FloatingRestTimer';
import { dispatchAIWorkoutEvent, AI_REST_ADJUST, AI_REST_SKIP } from '../../utils/aiWorkoutEvents';

describe('FloatingRestTimer L3', () => {
  it('has a Skip rest button that halts the countdown and announces', () => {
    render(<FloatingRestTimer onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /skip rest/i }));
    expect(screen.getByTestId('rest-live-region').textContent).toMatch(/rest skipped/i);
  });

  it('voice adjust (+15) through the AI event family changes the duration', () => {
    render(<FloatingRestTimer onClose={() => {}} />);
    let handled = false;
    act(() => { handled = dispatchAIWorkoutEvent(AI_REST_ADJUST, { deltaSeconds: 15 }); });
    expect(handled).toBe(true);
    expect(screen.getAllByText('1:45').length).toBeGreaterThan(0); // 90s default + 15
  });

  it('rejects out-of-range voice deltas — ack(false), duration unchanged', () => {
    render(<FloatingRestTimer onClose={() => {}} />);
    let handled = true;
    act(() => { handled = dispatchAIWorkoutEvent(AI_REST_ADJUST, { deltaSeconds: 999 }); });
    expect(handled).toBe(false);
    expect(screen.getAllByText('1:30').length).toBeGreaterThan(0);
  });

  it('voice skip works through the same family', () => {
    render(<FloatingRestTimer onClose={() => {}} />);
    let handled = false;
    act(() => { handled = dispatchAIWorkoutEvent(AI_REST_SKIP, {}); });
    expect(handled).toBe(true);
    expect(screen.getByTestId('rest-live-region').textContent).toMatch(/rest skipped/i);
  });
});
