import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpecialBadge } from './SpecialBadge';

describe('SpecialBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders bonus sessions count', () => {
    render(
      <SpecialBadge
        name="Test Special"
        bonusSessions={2}
        endsAt="2026-01-20T23:59:59Z"
      />
    );

    expect(screen.getByText(/\+2 BONUS/i)).toBeInTheDocument();
  });

  it('shows countdown for days remaining', () => {
    render(
      <SpecialBadge
        name="Test Special"
        bonusSessions={3}
        endsAt="2026-01-20T23:59:59Z"
      />
    );

    expect(screen.getByText(/d.*left/i)).toBeInTheDocument();
  });

  it('returns null when expired', () => {
    const { container } = render(
      <SpecialBadge
        name="Expired Special"
        bonusSessions={1}
        endsAt="2026-01-10T23:59:59Z"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows hours when less than a day remains', () => {
    render(
      <SpecialBadge
        name="Ending Soon"
        bonusSessions={1}
        endsAt="2026-01-15T20:00:00Z"
      />
    );

    expect(screen.getByText(/h.*left/i)).toBeInTheDocument();
  });
});
