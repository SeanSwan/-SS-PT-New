/**
 * ClientHomeTab — canonical /overview schedule-truth regression tests
 * ====================================================================
 * Locks the NextSessionCard explicit-static-placeholder contract on the
 * canonical /dashboard/client/overview surface.
 *
 * Regression intent (canonical-surface-audit 2026-04-13, KPI-truth pass):
 *   /api/schedule/upcoming does not exist. The NextSessionCard must be an
 *   explicit static CTA — no implied live "next session" data, no fake
 *   upcoming time, no data claim that cannot be supported by a real endpoint.
 *
 *   The prior label "Schedule" + subtext "Book your next training session"
 *   passed the letter (no false data) but could be skim-read as a live
 *   schedule header. The canonical-surface-audit bar requires "explicitly
 *   static" — no ambiguity. Tightened to "Next Session — Not booked yet".
 *
 * These tests render ClientHomeTab with mocked hooks and assert:
 *   1. The explicit not-booked subtext is rendered
 *   2. No fake upcoming-session time string is present
 *   3. Book Session CTA is present and navigates to /dashboard/client/schedule
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock react-router-dom ────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// ── Mock auth context ────────────────────────────────────────────────────
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' },
  }),
}));

// ── Mock useGamificationData — return a plausible profile ───────────────
vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({
    profile: {
      data: {
        id: '42',
        firstName: 'Test',
        lastName: 'Client',
        username: 'testclient',
        points: 2500,
        level: 5,
        tier: 'silver_edge',
        streakDays: 12,
        nextLevelProgress: 65,
      },
      isLoading: false,
      error: null,
    },
    isLoading: false,
  }),
}));

// ── Stub SwanCoachDockClient so we don't pull in unrelated children ─────
vi.mock('./SwanCoachDockClient', () => ({
  default: () => <div data-testid="swan-coach-dock" />,
}));

import ClientHomeTab from './ClientHomeTab';

describe('ClientHomeTab — NextSessionCard explicit-static truth lock', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders the NextSessionCard with an explicit "Not booked yet" subtext (not a fake live schedule)', () => {
    render(<ClientHomeTab />);

    const card = screen.getByTestId('next-session-card');
    expect(card).toBeInTheDocument();

    // HARD ASSERTIONS: visible label + subtext must be the explicit-static wording
    expect(card.textContent).toMatch(/next session/i);
    expect(card.textContent).toMatch(/not booked yet/i);
  });

  it('does NOT render any fake upcoming-session time string on the canonical /overview surface', () => {
    render(<ClientHomeTab />);

    const card = screen.getByTestId('next-session-card');
    // Negative assertions — none of these pseudo-live-data patterns may appear
    // in the NextSessionCard unless /api/schedule/upcoming is actually wired.
    expect(card.textContent).not.toMatch(/tomorrow at/i);
    expect(card.textContent).not.toMatch(/today at/i);
    expect(card.textContent).not.toMatch(/in \d+ (hour|day|minute)/i);
    // No specific clock time either (e.g. "3:00 PM", "15:00")
    expect(card.textContent).not.toMatch(/\d{1,2}:\d{2}\s?(am|pm)?/i);
    // No "your next session is ..." data claim
    expect(card.textContent).not.toMatch(/your next session is/i);
  });

  it('Book Session CTA is present inside the NextSessionCard and navigates to /dashboard/client/schedule', async () => {
    const user = userEvent.setup();
    render(<ClientHomeTab />);

    const card = screen.getByTestId('next-session-card');
    const bookBtn = card.querySelector('button[aria-label="Book a session"]');
    expect(bookBtn).not.toBeNull();

    await user.click(bookBtn as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
  });

  it('does NOT mount any weight or body-measurement widget on canonical /overview', () => {
    // Negative assertion — /overview has zero weight/measurement widgets by design.
    // This test locks the absence so a future regression can't silently add a
    // half-wired weight card that claims data it doesn't have.
    const { container } = render(<ClientHomeTab />);

    const text = container.textContent || '';
    // None of these weight/measurement KPI patterns may appear on /overview
    expect(text).not.toMatch(/current weight/i);
    expect(text).not.toMatch(/body fat/i);
    expect(text).not.toMatch(/bmi/i);
    expect(text).not.toMatch(/measurement/i);
    expect(text).not.toMatch(/weight progression/i);
  });
});
