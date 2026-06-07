import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('ClientWorkoutPlansPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/workout-plans/client/424242');
    expect(await screen.findByRole('heading', { name: /training plans/i })).toBeInTheDocument();
    expect(screen.getAllByText('Phase 2 Strength Plan').length).toBeGreaterThan(0);
    expect(screen.getByText(/^current$/i)).toBeInTheDocument();
    expect(screen.getByText(/nasm phase 2/i)).toBeInTheDocument();
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

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect((await screen.findAllByText('Server Canonical Six Month Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 7 arcs filled')).toBeInTheDocument();
    expect(screen.getByLabelText(/6 month plan arc/i)).toHaveTextContent('Primary');
    expect(screen.getByText(/nasm phase 2/i)).toBeInTheDocument();
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
            durationWeeks: 26,
            updatedAt: '2026-06-03T12:00:00.000Z',
            planData: { goal: 'strength' },
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

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" onLogToday={onLogToday} />);

    expect((await screen.findAllByText('Primary Six Month Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText(/primary arc/i)).toBeInTheDocument();
    expect(screen.getAllByText(/6 month/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /open primary six month arc pdf/i }));

    expect(mockAuthAxios.get).toHaveBeenLastCalledWith(
      '/api/workout-plans/99/pdf/content.pdf',
      { responseType: 'blob' },
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(window.open).toHaveBeenCalledWith(
      'blob:fixture-plan-pdf',
      '_blank',
      'noopener,noreferrer',
    );

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
            planData: {
              goal: 'strength',
              planSummary: {
                durationWeeks: 48,
              },
            },
          },
        ],
      },
    });

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect((await screen.findAllByText('12 Month Strength Arc')).length).toBeGreaterThan(0);
    expect(screen.getByText(/48 weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/^strength$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log today from 12 month strength arc/i })).toBeNull();
  });

  it('blocks malformed client ids before calling the workout-plan API', () => {
    render(<ClientWorkoutPlansPanel clientId="fixture-424242" clientName="Fixture Client" />);

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

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect(await screen.findByText('Plan Arc Vault')).toBeInTheDocument();
    for (const label of ['1 Day', '1 Week', '1 Month', '3 Month', '6 Month', '9 Month', '12 Month']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Primary Six Month Arc').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Move Fitness Nine Month Arc').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /make 9 month primary arc/i }));

    expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(2);
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

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect((await screen.findAllByText('Eight Week Legacy Block')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/3 month plan arc/i)).toHaveTextContent('Eight Week Legacy Block');
    expect(screen.getByLabelText(/6 month plan arc/i)).toHaveTextContent('Pending');
  });
});
