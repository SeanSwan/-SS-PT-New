import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlansPanel from './ClientWorkoutPlansPanel';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
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

  it('loads selected-client plans from the canonical workout-plan list API', async () => {
    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/workout/plans', {
      params: { clientId: 424242 },
    });
    expect(await screen.findByRole('heading', { name: /training plans/i })).toBeInTheDocument();
    expect(screen.getByText('Phase 2 Strength Plan')).toBeInTheDocument();
    expect(screen.getByText(/^current$/i)).toBeInTheDocument();
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

    expect(await screen.findByText('Primary Six Month Arc')).toBeInTheDocument();
    expect(screen.getByText(/primary arc/i)).toBeInTheDocument();
    expect(screen.getByText(/6 month/i)).toBeInTheDocument();
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

    expect(await screen.findByText('12 Month Strength Arc')).toBeInTheDocument();
    expect(screen.getByText(/48 weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/^strength$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log today from 12 month strength arc/i })).toBeNull();
  });

  it('blocks malformed client ids before calling the workout-plan API', () => {
    render(<ClientWorkoutPlansPanel clientId="fixture-424242" clientName="Fixture Client" />);

    expect(mockAuthAxios.get).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid client/i);
  });
});
