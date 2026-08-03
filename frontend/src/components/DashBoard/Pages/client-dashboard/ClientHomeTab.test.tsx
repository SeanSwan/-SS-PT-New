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

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock react-router-dom ────────────────────────────────────────────────
const mockNavigate = vi.fn();
const mockCreatePostMutate = vi.hoisted(() => vi.fn());
const mockApiGet = vi.hoisted(() => vi.fn());
const mockCurrentWorkoutResponse = vi.hoisted(() => ({ value: null as unknown }));
const mockGetUpcomingSessions = vi.hoisted(() => vi.fn());
const mockAuthUser = vi.hoisted(() => ({
  current: {
    id: 42,
    firstName: 'Test',
    lastName: 'Client',
    username: 'testclient',
    clientSource: 'swanstudios',
  } as Record<string, unknown>,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

// ── Mock auth context ────────────────────────────────────────────────────
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser.current,
  }),
}));

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: mockApiGet,
  },
  ProductionTokenManager: {
    getToken: () => null,
  },
}));

vi.mock('../../../../services/sessionService', () => ({
  default: {
    getUpcomingSessions: mockGetUpcomingSessions,
  },
}));

// ── Mock useGamificationData — return a plausible profile ───────────────
vi.mock('../../../../context/ThemeContext', () => ({
  UniversalThemeToggle: () => null,
}));
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
  useMessageSummary: () => ({
    data: [],
    isLoading: false,
  }),
  useNotificationSummary: () => ({
    data: { notifications: [] },
    isLoading: false,
  }),
  useWorkoutSessions: () => ({
    data: [],
    isLoading: false,
  }),
  useTrendingHashtags: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('../../../../hooks/social/useSocialFeed', () => ({
  useSocialFeed: () => ({
    posts: [],
    isLoading: false,
    error: null,
    createPost: mockCreatePostMutate,
    isCreatingPost: false,
  }),
}));

// The sessions-remaining banner uses react-query via useSessionCredits; mock it
// so ClientHomeTab renders without a QueryClientProvider (matches the other
// data-hook mocks above). For non-deducting sources the banner renders null.
vi.mock('../../../UniversalMasterSchedule/hooks/useSessionCredits', () => ({
  useSessionCredits: () => ({
    data: { sessionsRemaining: 8, clientSource: 'swanstudios', packageName: null, expiresAt: null },
    isLoading: false,
    isError: false,
  }),
}));

import ClientHomeTab from './ClientHomeTab';

function defaultCurrentWorkoutResponse() {
  return {
    data: {
      success: true,
      data: null,
      plan: null,
      message: 'No workout plan assigned yet. Your trainer will create one after your assessment.',
    },
  };
}

function setCurrentWorkoutResponse(response: unknown) {
  mockCurrentWorkoutResponse.value = response;
}

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
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    mockCreatePostMutate.mockReset();
    mockCreatePostMutate.mockResolvedValue({ success: true });
    mockGetUpcomingSessions.mockReset();
    mockGetUpcomingSessions.mockResolvedValue([]);
    mockApiGet.mockReset();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:swan-plan-pdf'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    mockAuthUser.current = {
      id: 42,
      firstName: 'Test',
      lastName: 'Client',
      username: 'testclient',
      clientSource: 'swanstudios',
    };
    setCurrentWorkoutResponse(defaultCurrentWorkoutResponse());
    mockApiGet.mockImplementation((url: string, config?: unknown) => {
      if (url === '/api/workouts/42/current') return Promise.resolve(mockCurrentWorkoutResponse.value);
      if (String(url).startsWith('/api/workout-plans/') && (config as { responseType?: string } | undefined)?.responseType === 'blob') {
        return Promise.resolve({ data: new Blob(['%PDF-1.4\n%%EOF\n'], { type: 'application/pdf' }) });
      }
      return Promise.resolve({ data: { success: true, data: null, summary: null } });
    });
  });

  it('renders the NextSessionCard with an explicit "Not booked yet" subtext (not a fake live schedule)', async () => {
    await renderClientHomeSettled();

    const card = await screen.findByTestId('next-session-card');
    expect(card).toBeInTheDocument();

    // HARD ASSERTIONS: visible label + subtext must be the explicit-static wording
    expect(card.textContent).toMatch(/next session/i);
    expect(card.textContent).toMatch(/not booked yet/i);
  });

  it('does NOT render any fake upcoming-session time string on the canonical /overview surface', async () => {
    await renderClientHomeSettled();

    const card = await screen.findByTestId('next-session-card');
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

    const card = await screen.findByTestId('next-session-card');
    const bookBtn = card.querySelector('button[aria-label="Book a session"]');
    expect(bookBtn).not.toBeNull();

    await user.click(bookBtn as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
  });

  it('keeps Log Workout and Progress as first-viewport hero actions', async () => {
    const user = userEvent.setup();
    await renderClientHomeSettled();

    const hero = screen.getByTestId('client-dashboard-home');
    const [logWorkoutButton] = within(hero).getAllByRole('button', { name: /log workout/i });
    const [progressButton] = within(hero).getAllByRole('button', { name: /view progress/i });

    await user.click(logWorkoutButton);
    await user.click(progressButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/progress');
  });

  it('does not expose SwanStudios booking actions for Move Fitness clients', async () => {
    mockAuthUser.current = {
      id: 42,
      firstName: 'Test',
      lastName: 'Client',
      username: 'testclient',
      clientSource: 'move_fitness',
    };

    await renderClientHomeSettled();

    expect(screen.queryAllByRole('button', { name: /book session/i })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /book a session/i })).toHaveLength(0);
    expect(screen.queryByTestId('next-session-card')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^book$/i })).toHaveLength(0);
  });

  it('renders the active current workout with a one-tap log action from the canonical workout endpoint', async () => {
    const user = userEvent.setup();
    setCurrentWorkoutResponse({
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
          todayAssignment: {
            assignmentType: 'homework',
            status: 'planned',
            sessionType: 'solo',
            isLoggable: true,
            isBillable: false,
            shouldDeductSession: false,
            title: 'Coach Homework Lower Strength',
            weekNumber: 2,
            dayNumber: 3,
            dayLabel: 'Lower Strength',
            exerciseCount: 4,
            firstExerciseName: 'Goblet Squat',
            ctaLabel: 'Log Assignment',
          },
          trainingPlanCatalog: {
            defaultHorizonKey: 'six_month',
            primaryPlanId: 'plan-6m',
            slots: [
              { horizonKey: 'one_day', label: '1 Day', isFilled: false, isPrimary: false, plan: null },
              { horizonKey: 'one_week', label: '1 Week', isFilled: false, isPrimary: false, plan: null },
              { horizonKey: 'one_month', label: '1 Month', isFilled: false, isPrimary: false, plan: null },
              { horizonKey: 'three_month', label: '3 Month', isFilled: false, isPrimary: false, plan: null },
              {
                horizonKey: 'six_month',
                label: '6 Month',
                isFilled: true,
                isPrimary: true,
                plan: {
                  id: 'plan-6m',
                  title: 'Phase 1 Stabilization',
                  pdfFile: {
                    url: '/api/workout-plans/plan-6m/pdf/content.pdf',
                    fileName: 'Six Month Foundation.pdf',
                    contentType: 'application/pdf',
                  },
                },
              },
              { horizonKey: 'nine_month', label: '9 Month', isFilled: false, isPrimary: false, plan: null },
              { horizonKey: 'twelve_month', label: '12 Month', isFilled: false, isPrimary: false, plan: null },
            ],
          },
        },
        todayAssignment: {
          assignmentType: 'homework',
          status: 'planned',
          sessionType: 'solo',
          isLoggable: true,
          isBillable: false,
          shouldDeductSession: false,
          title: 'Coach Homework Lower Strength',
          weekNumber: 2,
          dayNumber: 3,
          dayLabel: 'Lower Strength',
          exerciseCount: 4,
          firstExerciseName: 'Goblet Squat',
          ctaLabel: 'Log Assignment',
        },
      },
    });

    render(<ClientHomeTab />);

    const card = await screen.findByTestId('current-workout-card');
    expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
    expect(card.textContent).toMatch(/today's assignment/i);
    expect(card.textContent).toMatch(/coach homework lower strength/i);
    expect(card.textContent).toMatch(/goblet squat/i);
    expect(card.textContent).toMatch(/homework/i);
    expect(card.textContent).toMatch(/save after training/i);
    expect(card.textContent).toMatch(/6 month/i);
    expect(card.textContent).toMatch(/week 2/i);
    expect(card.textContent).toMatch(/day 3/i);
    expect(card.textContent).toMatch(/4 exercises/i);

    await user.click(within(card).getByRole('button', { name: /log assignment/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today&assignmentType=homework');
  });

  it('routes completed planned homework to workout history instead of another log attempt', async () => {
    const user = userEvent.setup();
    setCurrentWorkoutResponse({
      data: {
        success: true,
        data: {
          title: 'Coach Homework Lower Strength',
          todayAssignment: {
            assignmentType: 'homework',
            status: 'completed',
            sessionType: 'solo',
            isLoggable: false,
            isBillable: false,
            shouldDeductSession: false,
            title: 'Coach Homework Lower Strength',
            weekNumber: 2,
            dayNumber: 3,
            dayLabel: 'Lower Strength',
            exerciseCount: 4,
            firstExerciseName: 'Goblet Squat',
            ctaLabel: 'Review Workout',
          },
          trainingPlanCatalog: {
            defaultHorizonKey: 'six_month',
            primaryPlanId: 'plan-6m',
            slots: [
              { horizonKey: 'six_month', label: '6 Month', isFilled: true, isPrimary: true, plan: { id: 'plan-6m', title: 'Phase 1 Stabilization' } },
            ],
          },
        },
        todayAssignment: {
          assignmentType: 'homework',
          status: 'completed',
          sessionType: 'solo',
          isLoggable: false,
          isBillable: false,
          shouldDeductSession: false,
          title: 'Coach Homework Lower Strength',
          weekNumber: 2,
          dayNumber: 3,
          dayLabel: 'Lower Strength',
          exerciseCount: 4,
          firstExerciseName: 'Goblet Squat',
          ctaLabel: 'Review Workout',
        },
      },
    });

    render(<ClientHomeTab />);

    const card = await screen.findByTestId('current-workout-card');
    expect(card.textContent).toMatch(/coach homework lower strength/i);
    expect(card.textContent).toMatch(/logged today/i);

    await user.click(within(card).getByRole('button', { name: /review workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('routes trainer-led plan assignments to schedule instead of client self-logging', async () => {
    const user = userEvent.setup();
    setCurrentWorkoutResponse({
      data: {
        success: true,
        data: {
          title: 'Coach Floor Session',
          todayAssignment: {
            assignmentType: 'trainer_session',
            status: 'planned',
            sessionType: 'trainer-led',
            isLoggable: false,
            isBillable: true,
            shouldDeductSession: false,
            title: 'Coach Floor Session',
            weekNumber: 4,
            dayNumber: 2,
            dayLabel: 'Strength Floor',
            exerciseCount: 5,
            firstExerciseName: 'Trap Bar Deadlift',
            ctaLabel: 'View Schedule',
          },
          trainingPlanCatalog: {
            defaultHorizonKey: 'six_month',
            primaryPlanId: 'plan-6m',
            slots: [
              {
                horizonKey: 'six_month',
                label: '6 Month',
                isFilled: true,
                isPrimary: true,
                plan: {
                  id: 'plan-6m',
                  title: 'Coach Floor Session',
                  status: 'active',
                },
              },
            ],
          },
        },
      },
    });

    render(<ClientHomeTab />);

    const card = await screen.findByTestId('current-workout-card');
    expect(card.textContent).toMatch(/trainer session/i);
    expect(card.textContent).toMatch(/coach floor session/i);

    await user.click(within(card).getByRole('button', { name: /view schedule/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('renders backend pending assignment details when the client has plan arcs but no active workout yet', async () => {
    const user = userEvent.setup();
    setCurrentWorkoutResponse({
      data: {
        success: true,
        data: null,
        plan: null,
        todayAssignment: {
          assignmentType: 'none',
          status: 'none',
          sessionType: 'solo',
          isLoggable: false,
          isBillable: false,
          shouldDeductSession: false,
          title: 'Trainer is building your 6 Month plan',
          exerciseCount: 0,
          ctaLabel: 'Review Plan Vault',
        },
        trainingPlanCatalog: {
          defaultHorizonKey: 'six_month',
          primaryPlanId: 'plan-6m-draft',
          primaryHorizonKey: 'six_month',
          filledHorizonKeys: ['six_month'],
          slots: [
            { horizonKey: 'one_day', label: '1 Day', isFilled: false, isPrimary: false, plan: null },
            { horizonKey: 'one_week', label: '1 Week', isFilled: false, isPrimary: false, plan: null },
            { horizonKey: 'one_month', label: '1 Month', isFilled: false, isPrimary: false, plan: null },
            { horizonKey: 'three_month', label: '3 Month', isFilled: false, isPrimary: false, plan: null },
            {
              horizonKey: 'six_month',
              label: '6 Month',
              isFilled: true,
              isPrimary: true,
              plan: {
                id: 'plan-6m-draft',
                title: 'Default Six Month Arc',
                status: 'draft',
              },
            },
            { horizonKey: 'nine_month', label: '9 Month', isFilled: false, isPrimary: false, plan: null },
            { horizonKey: 'twelve_month', label: '12 Month', isFilled: false, isPrimary: false, plan: null },
          ],
        },
      },
    });

    render(<ClientHomeTab />);

    const card = await screen.findByTestId('current-workout-card');
    expect(card.textContent).toMatch(/trainer is building your 6 month plan/i);
    expect(card.textContent).toMatch(/6 month/i);
    expect(card.textContent).toMatch(/open assigned plan/i);

    await user.click(within(card).getByRole('button', { name: /review plan vault/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
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

  it('turns the Reels spotlight into a structured workout post action', async () => {
    const user = userEvent.setup();
    render(<ClientHomeTab />);

    await user.click(screen.getByRole('button', { name: /^Training$/i }));
    await user.type(screen.getByLabelText(/write a community post/i), 'A controlled strength set from today');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(mockCreatePostMutate).toHaveBeenCalledWith({
      content: 'A controlled strength set from today #WorkoutDiary #SwanProgress',
      type: 'workout',
      visibility: 'friends',
    });
  });

  it('queues selected media through the existing social post mutation', async () => {
    const user = userEvent.setup();
    render(<ClientHomeTab />);
    const file = new File(['training clip'], 'training-clip.mp4', { type: 'video/mp4' });

    await user.upload(screen.getByLabelText(/attach media to quick post/i), file);
    expect(screen.getAllByText('training-clip.mp4').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText(/write a community post/i), 'Clip from the final set');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    expect(mockCreatePostMutate).toHaveBeenCalledWith({
      content: 'Clip from the final set #WorkoutDiary #SwanProgress #SwanStudios',
      type: 'workout',
      visibility: 'friends',
      media: file,
    });
  });
});
