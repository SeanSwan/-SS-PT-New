import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlansPanel from './ClientWorkoutPlansPanel';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const sixMonthSlot = {
  horizonKey: 'six_month',
  label: '6 Month',
  durationWeeks: 26,
  durationDays: 182,
  isDefaultHorizon: true,
  isFilled: true,
  isPrimary: true,
  plan: {
    id: 'plan-server-6m',
    title: 'Homework Arc',
    status: 'active',
    horizonKey: 'six_month',
    durationWeeks: 26,
    assignmentDefault: 'homework',
    billingIntent: 'non_billable_assignment',
    defaultShouldDeductSession: false,
  },
};

const responseWithHomework = (homeworkSummary: Record<string, unknown>) => ({
  data: {
    success: true,
    trainingPlanCatalog: {
      primaryPlanId: 'plan-server-6m',
      primaryHorizonKey: 'six_month',
      slots: [sixMonthSlot],
    },
    homeworkSummary,
  },
});

const renderPanel = () => (
  render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />)
);

describe('ClientWorkoutPlansPanel homework summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.put.mockResolvedValue({ data: { success: true } });
  });

  it('shows today homework position and non-billable session semantics', async () => {
    mockAuthAxios.get.mockResolvedValueOnce(responseWithHomework({
      assignmentType: 'homework',
      todayStatus: 'completed',
      todayIsCompleted: true,
      todayIsLoggable: false,
      todayShouldDeductSession: false,
      todayWeekNumber: 4,
      todayDayNumber: 2,
      todayExerciseCount: 3,
      todayFirstExerciseName: 'Goblet Squat',
      recentCompletedCount: 1,
      lastCompletedAt: '2026-06-05T12:00:00.000Z',
      recentCompletions: [{
        assignmentType: 'homework',
        formId: 'daily-form-1',
        completedAt: '2026-06-05T12:00:00.000Z',
        weekNumber: 4,
        dayNumber: 2,
        exerciseCount: 3,
        firstExerciseName: 'Goblet Squat',
      }],
    }));

    renderPanel();

    const homeworkPanel = await screen.findByLabelText(/off-day homework summary/i);
    const todayHomework = within(homeworkPanel).getByLabelText(/today homework assignment/i);
    expect(todayHomework).toHaveTextContent(/completed today/i);
    expect(todayHomework).toHaveTextContent(/week 4 - day 2/i);
    expect(todayHomework).toHaveTextContent(/homework is non-billable/i);
  });

  it('surfaces an accountability signal when the first homework log is still pending', async () => {
    mockAuthAxios.get.mockResolvedValueOnce(responseWithHomework({
      assignmentType: 'homework',
      todayStatus: 'planned',
      todayIsCompleted: false,
      todayIsLoggable: true,
      todayShouldDeductSession: false,
      todayWeekNumber: 1,
      todayDayNumber: 2,
      todayExerciseCount: 4,
      todayFirstExerciseName: 'Split Squat',
      recentCompletedCount: 0,
      recentCompletions: [],
    }));

    renderPanel();

    const homeworkPanel = await screen.findByLabelText(/off-day homework summary/i);
    const accountability = within(homeworkPanel).getByLabelText(/homework accountability status/i);
    expect(accountability).toHaveTextContent(/first homework log pending/i);
    expect(accountability).toHaveTextContent(/no off-day homework diary logs yet/i);
  });

  it('stays hidden when there is no homework today or recent homework history', async () => {
    mockAuthAxios.get.mockResolvedValueOnce(responseWithHomework({
      assignmentType: 'trainer_session',
      todayStatus: 'planned',
      todayIsCompleted: false,
      todayIsLoggable: false,
      todayShouldDeductSession: false,
      todayWeekNumber: 4,
      todayDayNumber: 1,
      todayExerciseCount: 4,
      todayFirstExerciseName: 'Bench Press',
      recentCompletedCount: 0,
      recentCompletions: [],
    }));

    renderPanel();

    // Render-settled anchor: the panel's heading is "Plan Library" (was
    // "Training Plans" before the plan-library redesign).
    expect(await screen.findByRole('heading', { name: /plan library/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/off-day homework summary/i)).toBeNull();
  });
});
