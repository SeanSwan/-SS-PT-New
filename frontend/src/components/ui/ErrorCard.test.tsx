/**
 * ErrorCard — the shared "we failed to load this" card (Blueprint v2 D2).
 * These tests pin the two things that make it honest: it announces itself to
 * assistive tech, and it offers a way back.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorCard from './ErrorCard';

describe('ErrorCard', () => {
  it('announces the failure as an alert', () => {
    render(<ErrorCard message="We couldn't load this week's recap." />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load this week's recap.");
  });

  it('calls onRetry when the retry button is pressed', () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="Failed." onRetry={onRetry} testId="x-error" />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no button when the surface cannot re-fetch', () => {
    render(<ErrorCard message="Failed." />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('exposes the testId the surface contract looks for', () => {
    render(<ErrorCard message="Failed." testId="roster-error" />);
    expect(screen.getByTestId('roster-error')).toBeInTheDocument();
  });
});
