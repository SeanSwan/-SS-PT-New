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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock react-router-dom ────────────────────────────────────────────────
const mockNavigate = vi.fn();
const mockCreatePostMutate = vi.hoisted(() => vi.fn());
const mockApiGet = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

// ── Mock auth context ────────────────────────────────────────────────────
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' },
  }),
}));

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: mockApiGet,
  },
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
    achievements: {
      data: [],
      isLoading: false,
      error: null,
    },
    levelProgress: {
      progressPercent: 65,
    },
    isLoading: false,
  }),
}));

// Mock dashboard data hooks consumed by the redesigned overview.
vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useSocialFeed: () => ({
    data: [],
    isLoading: false,
  }),
  useSocialChallenges: () => ({
    data: [],
    isLoading: false,
  }),
  useLeaderboard: () => ({
    data: [],
    isLoading: false,
  }),
  useCreatePost: () => ({
    mutateAsync: mockCreatePostMutate,
    isPending: false,
  }),
}));

import ClientHomeTab from './ClientHomeTab';

async function renderClientHomeSettled() {
  const result = render(<ClientHomeTab />);
  await waitFor(() => {
    const card = screen.getByTestId('current-workout-card');
    expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
    expect(card.textContent).toMatch(/plan pending/i);
    expect(card.textContent).not.toMatch(/loading plan/i);
  });
  return result;
}

describe('ClientHomeTab — NextSessionCard explicit-static truth lock', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreatePostMutate.mockReset();
    mockCreatePostMutate.mockResolvedValue({ success: true });
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: null,
        plan: null,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.',
      },
    });
  });

  it('renders the NextSessionCard with an explicit "Not booked yet" subtext (not a fake live schedule)', async () => {
    await renderClientHomeSettled();

    const card = screen.getByTestId('next-session-card');
    expect(card).toBeInTheDocument();

    // HARD ASSERTIONS: visible label + subtext must be the explicit-static wording
    expect(card.textContent).toMatch(/next session/i);
    expect(card.textContent).toMatch(/not booked yet/i);
  });

  it('does NOT render any fake upcoming-session time string on the canonical /overview surface', async () => {
    await renderClientHomeSettled();

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
    await renderClientHomeSettled();

    const card = screen.getByTestId('next-session-card');
    const bookBtn = card.querySelector('button[aria-label="Book a session"]');
    expect(bookBtn).not.toBeNull();

    await user.click(bookBtn as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
  });

  it('renders the active current workout with a one-tap log action from the canonical workout endpoint', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          title: 'Phase 1 Stabilization',
          currentWeek: 2,
          currentDay: 3,
          currentSession: {
            weekNumber: 2,
            dayNumber: 3,
            dayLabel: 'Lower Strength',
            exercises: [
              { name: 'Goblet Squat' },
              { name: 'Split Squat' },
              { name: 'Row' },
              { name: 'Carry' },
            ],
          },
        },
      },
    });

    render(<ClientHomeTab />);

    const card = await screen.findByTestId('current-workout-card');
    expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
    expect(card.textContent).toMatch(/current workout/i);
    expect(card.textContent).toMatch(/phase 1 stabilization/i);
    expect(card.textContent).toMatch(/week 2/i);
    expect(card.textContent).toMatch(/day 3/i);
    expect(card.textContent).toMatch(/4 exercises/i);

    await user.click(screen.getByRole('button', { name: /start current workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });

  it('does NOT mount any weight or body-measurement widget on canonical /overview', async () => {
    // Negative assertion — /overview has zero weight/measurement widgets by design.
    // This test locks the absence so a future regression can't silently add a
    // half-wired weight card that claims data it doesn't have.
    const { container } = await renderClientHomeSettled();

    const text = container.textContent || '';
    // None of these weight/measurement KPI patterns may appear on /overview
    expect(text).not.toMatch(/current weight/i);
    expect(text).not.toMatch(/body fat/i);
    expect(text).not.toMatch(/bmi/i);
    expect(text).not.toMatch(/measurement/i);
    expect(text).not.toMatch(/weight progression/i);
  });

  it('turns the Reels spotlight into a structured reel post action', async () => {
    const user = userEvent.setup();
    render(<ClientHomeTab />);

    await user.click(screen.getByRole('button', { name: /create reel/i }));
    await user.type(screen.getByLabelText(/create a community post/i), 'A controlled strength set from today');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(mockCreatePostMutate).toHaveBeenCalledWith({
      content: 'A controlled strength set from today',
      type: 'reel',
      visibility: 'friends',
      media: null,
    });
  });

  it('queues selected media through the existing social post mutation', async () => {
    const user = userEvent.setup();
    render(<ClientHomeTab />);
    const file = new File(['training clip'], 'training-clip.mp4', { type: 'video/mp4' });

    await user.upload(screen.getByLabelText(/attach media to quick post/i), file);
    expect(screen.getByText('training-clip.mp4')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/create a community post/i), 'Clip from the final set');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(mockCreatePostMutate).toHaveBeenCalledWith({
      content: 'Clip from the final set',
      type: 'training',
      visibility: 'friends',
      media: file,
    });
  });
});
