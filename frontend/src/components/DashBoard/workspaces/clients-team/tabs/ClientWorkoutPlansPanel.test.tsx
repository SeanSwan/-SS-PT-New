import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const renderPlansPanel = (props: Partial<ComponentProps<typeof ClientWorkoutPlansPanel>> = {}) => (
  render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" {...props} />)
);
describe('ClientWorkoutPlansPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixture-plan-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(window, 'open').mockImplementation(() => null);
    mockAuthAxios.put.mockResolvedValue({ data: { success: true } });
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [
          {
            id: 77,
            title: 'Phase 2 Strength Plan',
            status: 'active',
            goal: 'strength',
            nasmPhase: 2,
            durationWeeks: 8,
            updatedAt: '2026-06-01T12:00:00.000Z',
          },
        ],
      },
    });
  });
  it('loads selected-client plans from the canonical client plan overview API', async () => {
    renderPlansPanel();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/workout-plans/client/424242');
    expect(await screen.findByRole('heading', { name: /plan library/i })).toBeInTheDocument();
    expect(screen.getAllByText('Phase 2 Strength Plan').length).toBeGreaterThan(0);
    expect(screen.getByText(/nasm phase 2/i)).toBeInTheDocument();
  });
  it('reloads saved plans when the parent refresh signal changes after Build Plan save', async () => {
    const { rerender } = renderPlansPanel({ refreshSignal: 0 });
    expect(await screen.findByRole('heading', { name: /plan library/i })).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(1);
    rerender(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" refreshSignal={1} />);
    await waitFor(() => expect(mockAuthAxios.get).toHaveBeenCalledTimes(2));
  });
  it('prefers the server trainingPlanCatalog when the client overview returns no raw plans list', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        plan: { id: 'plan-server-6m' },
        trainingPlanCatalog: {
          primaryPlanId: 'plan-server-6m',
          primaryHorizonKey: 'six_month',
          slots: [
            {
              horizonKey: 'six_month',
              label: '6 Month',
              durationWeeks: 26,
              durationDays: 182,
              isDefaultHorizon: true,
              isFilled: true,
              isPrimary: true,
              plan: {
                id: 'plan-server-6m',
                title: 'Server Canonical Six Month Arc',
                status: 'active',
                horizonKey: 'six_month',
                durationWeeks: 26,
                nasmPhase: 2,
                isPrimary: true,
              },
            },
          ],
        },
      },
    });
    renderPlansPanel();
    expect((await screen.findAllByText('Server Canonical Six Month Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 7 arcs filled')).toBeInTheDocument();
    expect(screen.getByLabelText(/6 month plan arc/i)).toHaveTextContent('Primary');
    expect(screen.getByText(/nasm phase 2/i)).toBeInTheDocument();
  });
  it('shows whether a vault arc is homework diary work or trainer-led scheduled work', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        trainingPlanCatalog: {
          primaryPlanId: 'plan-server-6m',
          primaryHorizonKey: 'six_month',
          slots: [
            {
              horizonKey: 'six_month',
              label: '6 Month',
              durationWeeks: 26,
              durationDays: 182,
              isDefaultHorizon: true,
              isFilled: true,
              isPrimary: true,
              plan: {
                id: 'plan-server-6m',
                title: 'Trainer Led Generated Arc',
                status: 'active',
                horizonKey: 'six_month',
                durationWeeks: 26,
                assignmentDefault: 'trainer_session',
                billingIntent: 'trainer_led_scheduled_flow',
                defaultShouldDeductSession: false,
              },
            },
            {
              horizonKey: 'one_week',
              label: '1 Week',
              durationWeeks: 1,
              durationDays: 7,
              isDefaultHorizon: false,
              isFilled: true,
              isPrimary: false,
              plan: {
                id: 'plan-homework',
                title: 'Homework Diary Arc',
                status: 'draft',
                horizonKey: 'one_week',
                durationWeeks: 1,
                assignmentDefault: 'homework',
                billingIntent: 'non_billable_assignment',
                defaultShouldDeductSession: false,
              },
            },
          ],
        },
      },
    });
    renderPlansPanel();
    expect(await screen.findByLabelText(/6 month plan arc/i)).toHaveTextContent('Trainer-led');
    expect(screen.getByLabelText(/1 week plan arc/i)).toHaveTextContent('Homework diary');
  });
  it('shows the trainer and admin off-day homework completion read model', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        trainingPlanCatalog: {
          primaryPlanId: 'plan-server-6m',
          primaryHorizonKey: 'six_month',
          slots: [
            {
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
            },
          ],
        },
        homeworkSummary: {
          assignmentType: 'homework',
          todayStatus: 'completed',
          todayIsCompleted: true,
          todayIsLoggable: false,
          todayShouldDeductSession: false,
          todayExerciseCount: 3,
          todayFirstExerciseName: 'Goblet Squat',
          recentCompletedCount: 2,
          lastCompletedAt: '2026-06-05T12:00:00.000Z',
          recentCompletions: [
            {
              assignmentType: 'homework',
              formId: 'daily-form-1',
              completedAt: '2026-06-05T12:00:00.000Z',
              weekNumber: 4,
              dayNumber: 2,
              exerciseCount: 3,
              firstExerciseName: 'Goblet Squat',
            },
            {
              assignmentType: 'homework',
              formId: 'daily-form-2',
              completedAt: '2026-06-02T12:00:00.000Z',
              weekNumber: 4,
              dayNumber: 1,
              exerciseCount: 2,
              firstExerciseName: 'Split Squat',
            },
          ],
        },
      },
    });

    renderPlansPanel();

    const homeworkPanel = await screen.findByLabelText(/off-day homework summary/i);
    expect(homeworkPanel).toHaveTextContent(/off-day homework/i);
    expect(homeworkPanel).toHaveTextContent(/completed today/i);
    expect(homeworkPanel).toHaveTextContent(/2 recent logs/i);
    expect(homeworkPanel).toHaveTextContent(/goblet squat/i);
    expect(homeworkPanel).toHaveTextContent(/recent homework history/i);
    expect(homeworkPanel).toHaveTextContent(/week 4/i);
    expect(homeworkPanel).toHaveTextContent(/day 1/i);
    expect(homeworkPanel).toHaveTextContent(/split squat/i);
  });
  it('surfaces primary horizon and opens protected PDFs through authAxios', async () => {
    const user = userEvent.setup();
    const onLogToday = vi.fn();
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        plans: [
          {
            id: 99,
            title: 'Primary Six Month Arc',
            status: 'active',
            nasmPhase: 2,
            durationWeeks: 26,
            updatedAt: '2026-06-03T12:00:00.000Z',
            planData: {
              goal: 'strength',
              planningSystem: 'swan_coach_planning',
            },
            metadata: {
              isPrimaryPlan: true,
              planHorizon: 'six_month',
              planPdf: {
                url: '/api/workout-plans/99/pdf/content.pdf',
                fileName: 'Primary Six Month Arc.pdf',
                contentType: 'application/pdf',
                updatedAt: '2026-06-03T12:01:00.000Z',
              },
            },
          },
        ],
      },
    }).mockResolvedValueOnce({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    });
    renderPlansPanel({ onLogToday });
    expect((await screen.findAllByText('Primary Six Month Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText(/primary arc/i)).toBeInTheDocument();
    expect(screen.getAllByText(/6 month/i).length).toBeGreaterThan(0);
    expect(
      within(screen.getByLabelText(/6 month plan arc/i)).getByRole('button', { name: /open 6 month pdf plan/i })
    ).toHaveTextContent(/open pdf/i);
    await user.click(screen.getByRole('button', { name: /open primary six month arc pdf/i }));
    expect(mockAuthAxios.get).toHaveBeenLastCalledWith('/api/workout-plans/99/pdf/content.pdf', { responseType: 'blob' });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const dialog = await screen.findByRole('dialog', { name: /primary six month arc pdf/i });
    expect(within(dialog).getByText('6 Month')).toBeInTheDocument();
    expect(within(dialog).getByText(/NASM phase 2/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Swan Coach Planning/i)).toBeInTheDocument();
    expect(screen.getByTitle(/primary six month arc pdf/i)).toHaveAttribute('src', 'blob:fixture-plan-pdf');
    expect(screen.getByRole('link', { name: /download primary six month arc\.pdf/i })).toHaveAttribute('href', 'blob:fixture-plan-pdf');
    await user.click(screen.getByRole('button', { name: /open pdf in new tab/i }));
    expect(window.open).toHaveBeenCalledWith('blob:fixture-plan-pdf', '_blank', 'noopener,noreferrer');
    await user.click(screen.getByRole('button', { name: /close pdf viewer/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /primary six month arc pdf/i })).toBeNull());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-plan-pdf');
    await user.click(screen.getByRole('button', { name: /log today from primary six month arc/i }));
    expect(onLogToday).toHaveBeenCalledTimes(1);
  });
  it('shows planner-saved planData goal and duration when top-level fields are absent', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        plans: [
          {
            id: 88,
            title: '12 Month Strength Arc',
            status: 'draft',
            nasmPhase: 3,
            updatedAt: '2026-06-02T12:00:00.000Z',
            planData: { goal: 'strength', planSummary: { durationWeeks: 48 } },
          },
        ],
      },
    });
    renderPlansPanel();
    expect((await screen.findAllByText('12 Month Strength Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText(/48 weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/^strength$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log today from 12 month strength arc/i })).toBeNull();
  });
  it('blocks malformed client ids before calling the workout-plan API', () => {
    renderPlansPanel({ clientId: 'fixture-424242' });
    expect(mockAuthAxios.get).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid client/i);
  });
  it('renders the seven trainer-facing horizon slots and promotes a chosen arc to primary', async () => {
    const user = userEvent.setup();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [
          {
            id: 'plan-6m',
            title: 'Primary Six Month Arc',
            status: 'active',
            durationWeeks: 26,
            updatedAt: '2026-06-03T12:00:00.000Z',
            metadata: { planHorizon: 'six_month', isPrimaryPlan: true },
          },
          {
            id: 'plan-9m',
            title: 'Move Fitness Nine Month Arc',
            status: 'draft',
            durationWeeks: 39,
            updatedAt: '2026-06-04T12:00:00.000Z',
            metadata: { planHorizon: 'nine_month' },
          },
        ],
      },
    });
    renderPlansPanel();
    expect(await screen.findByText('Plan Arc Library')).toBeInTheDocument();
    for (const label of ['1 Day', '1 Week', '1 Month', '3 Month', '6 Month', '9 Month', '12 Month']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    await user.click(screen.getByRole('button', { name: /make 9 month primary arc/i }));
    expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(2);
  });
  it('keeps plan-vault guidance opt-in and explains off-day logging semantics', async () => {
    const user = userEvent.setup();
    renderPlansPanel();
    expect(await screen.findByRole('heading', { name: /plan library/i })).toBeInTheDocument();
    expect(screen.queryByText(/seven swanstudios arcs stay visible/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /teach me: plan library/i }));
    expect(screen.getByText(/seven swanstudios arcs stay visible/i)).toBeInTheDocument();
    expect(screen.getByText(/homework diary logs are off-day plan work/i)).toBeInTheDocument();
    expect(screen.getByText(/scheduled paid session/i)).toBeInTheDocument();
  });
  it('maps custom eight-week plans to the closest SwanStudios horizon instead of falling back to six months', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        plans: [
          {
            id: 'plan-8w',
            title: 'Eight Week Legacy Block',
            status: 'active',
            durationWeeks: 8,
            updatedAt: '2026-06-04T12:00:00.000Z',
          },
        ],
      },
    });
    renderPlansPanel();
    expect((await screen.findAllByText('Eight Week Legacy Block')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/3 month plan arc/i)).toHaveTextContent('Eight Week Legacy Block');
    expect(screen.getByLabelText(/6 month plan arc/i)).toHaveTextContent('Pending');
  });
});
