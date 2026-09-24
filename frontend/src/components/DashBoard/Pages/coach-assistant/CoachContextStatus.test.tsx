/**
 * FILE: CoachContextStatus.test.tsx
 * PURPOSE: G04c — Session Desk context source quality strip (S6).
 *          Covers the quality table (verified/partial/unavailable), the no-self-reported-
 *          freshness rule (no fetches), unavailable retry/manual-review actions, and the
 *          bounded-source limit.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachContextStatus, { type CoachContextSource } from './CoachContextStatus';

const source = (overrides: Partial<CoachContextSource>): CoachContextSource => ({
  source: 'pain',
  label: 'Pain',
  quality: 'verified',
  ...overrides,
});

describe('G04c Session Desk context status', () => {
  it('renders verified and partial sources as read-only chips (no fetch, no actions)', () => {
    const { container } = render(
      <CoachContextStatus
        sources={[
          source({ source: 'pain', label: 'Pain', quality: 'verified' }),
          source({ source: 'schedule', label: 'Schedule', quality: 'partial', note: 'missing week 2' }),
        ]}
      />,
    );
    expect(screen.getByTestId('coach-context-status')).toBeTruthy();
    expect(screen.getByTestId('coach-context-source-pain').getAttribute('data-quality')).toBe('verified');
    expect(screen.getByTestId('coach-context-source-schedule').getAttribute('data-quality')).toBe('partial');
    expect(screen.getByText('missing week 2')).toBeTruthy();
    // No actions on available sources.
    expect(container.querySelector('[data-testid^="coach-context-retry-"]')).toBeNull();
    expect(container.querySelector('[data-testid^="coach-context-manual-"]')).toBeNull();
  });

  it('exposes Retry and Manual review only for unavailable sources', () => {
    const onRetry = vi.fn();
    const onManualReview = vi.fn();
    const { container } = render(
      <CoachContextStatus
        sources={[source({ source: 'equipment', label: 'Equipment', quality: 'unavailable', note: 'sync stale' })]}
        onRetry={onRetry}
        onManualReview={onManualReview}
      />,
    );
    expect(screen.getByTestId('coach-context-source-equipment').getAttribute('data-quality')).toBe('unavailable');
    expect(screen.getByText('Current equipment information is unavailable.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('coach-context-retry-equipment'));
    expect(onRetry).toHaveBeenCalledWith('equipment');
    fireEvent.click(screen.getByTestId('coach-context-manual-equipment'));
    expect(onManualReview).toHaveBeenCalledWith('equipment');
    // Verified sources carry no retry action.
    expect(container.querySelector('[data-testid="coach-context-retry-pain"]')).toBeNull();
  });

  it('renders nothing when there are no permission-filtered sources', () => {
    const { container } = render(<CoachContextStatus sources={[]} />);
    expect(container.querySelector('[data-testid="coach-context-status"]')).toBeNull();
  });

  it('bounds the strip to 12 sources', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      source({ source: `src-${index}`, label: `Source ${index}`, quality: 'verified' }),
    );
    const { container } = render(<CoachContextStatus sources={many} />);
    expect(container.querySelectorAll('[data-testid^="coach-context-source-"]')).toHaveLength(12);
  });
});
