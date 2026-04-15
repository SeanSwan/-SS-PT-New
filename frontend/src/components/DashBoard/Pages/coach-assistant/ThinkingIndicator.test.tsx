/**
 * ThinkingIndicator — CLS-reduction behavior test
 * ================================================
 * Phase 11.1 hotfix 2026-04-14: ThinkingIndicator previously returned
 * `null` when `isThinking` flipped false, removing a ~48px block from
 * the message list and causing a layout shift on every assistant
 * response. The new implementation always renders a StableSlot with a
 * fixed 48px min-height; only the inner Wrap toggles visibility.
 *
 * This test locks the new stable-height contract.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ThinkingIndicator from './ThinkingIndicator';

describe('ThinkingIndicator — CLS stability', () => {
  it('renders the StableSlot wrapper when isThinking=true', () => {
    render(<ThinkingIndicator isThinking={true} />);
    const slot = screen.getByTestId('thinking-indicator-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.getAttribute('aria-hidden')).toBe('false');
  });

  it('KEEPS the StableSlot wrapper when isThinking=false (no null return)', () => {
    // Core CLS fix. If this test fails, ThinkingIndicator has
    // regressed to the `if (!isThinking) return null` pattern.
    render(<ThinkingIndicator isThinking={false} />);
    const slot = screen.getByTestId('thinking-indicator-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the inner indicator bubble only when isThinking=true', () => {
    const { rerender } = render(<ThinkingIndicator isThinking={true} />);
    // The inner bubble has role="status" and aria-label
    expect(screen.getByRole('status', { name: /Swan Coach is thinking/i })).toBeInTheDocument();

    rerender(<ThinkingIndicator isThinking={false} />);
    // Slot stays; inner bubble does not
    expect(screen.getByTestId('thinking-indicator-slot')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /Swan Coach is thinking/i })).not.toBeInTheDocument();
  });
});
