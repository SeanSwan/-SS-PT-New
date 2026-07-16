/**
 * CoachSuggestionChips — B1a render/click/visibility contract
 * ===========================================================
 *  - chips fire onSelect with their exact text (same send path as typing)
 *  - hidden state keeps the slot mounted (CLS contract) but removes the
 *    chips from the tab order and marks them aria-hidden
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachSuggestionChips from './CoachSuggestionChips';

const CHIPS = ['Log a workout', 'Show my progress'];

describe('CoachSuggestionChips', () => {
  it('renders every chip as a 44px-class button and fires onSelect on click', () => {
    const onSelect = vi.fn();
    render(<CoachSuggestionChips chips={CHIPS} visible={true} onSelect={onSelect} />);

    const slot = screen.getByTestId('coach-suggestion-chips');
    expect(slot.getAttribute('aria-hidden')).toBe('false');

    const chip = screen.getByRole('button', { name: 'Log a workout' });
    expect(chip.getAttribute('type')).toBe('button');
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Log a workout');
  });

  it('stays mounted when hidden (CLS contract) but leaves the tab order', () => {
    render(<CoachSuggestionChips chips={CHIPS} visible={false} onSelect={() => {}} />);

    const slot = screen.getByTestId('coach-suggestion-chips');
    expect(slot.getAttribute('aria-hidden')).toBe('true');

    for (const text of CHIPS) {
      // Buttons still exist in the DOM but are untabbable while hidden
      const chip = screen.getByText(text);
      expect(chip.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('labels the group for assistive tech', () => {
    render(<CoachSuggestionChips chips={CHIPS} visible={true} onSelect={() => {}} />);
    expect(
      screen.getByRole('group', { name: 'Suggested next actions' }),
    ).toBeInTheDocument();
  });
});
