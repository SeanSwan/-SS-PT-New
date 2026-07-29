/**
 * C4c Today hero contract: week strip from real completed sessions (local
 * Monday week), CTA truth (log today vs progress when already logged), and
 * failure-silent degrade (CTA-only, never a crash, never fabricated dots).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientTodayHero from './ClientTodayHero';
import { bucketWeekDays } from './clientWeeklyRings.logic';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const mockGet = vi.fn();
// Stable identity like the real context — a fresh object per call would
// retrigger the [authAxios] effect every render (infinite loop → worker OOM).
const stableAuth = { authAxios: { get: mockGet } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

const session = (date: Date) => ({
  ts: date.toISOString(),
  durationMinutes: 45,
  volume: 1000,
  sets: 10,
});

const renderHero = () => render(<MemoryRouter><ClientTodayHero /></MemoryRouter>);

beforeEach(() => {
  mockNavigate.mockClear();
  mockGet.mockReset();
});

describe('bucketWeekDays', () => {
  it('marks logged local weekdays and today', () => {
    const now = new Date(2026, 6, 29, 12); // Wed
    const week = bucketWeekDays([session(new Date(2026, 6, 27, 9)), session(new Date(2026, 6, 29, 7))], now);
    expect(week[0]).toMatchObject({ logged: true, isToday: false });
    expect(week[2]).toMatchObject({ logged: true, isToday: true });
    expect(week[6]).toMatchObject({ logged: false });
    expect(week).toHaveLength(7);
  });

  it('ignores sessions outside this local week and garbage timestamps', () => {
    const now = new Date(2026, 6, 29, 12);
    const week = bucketWeekDays([
      session(new Date(2026, 6, 20, 9)),
      { ts: 'garbage', durationMinutes: 1, volume: 1, sets: 1 },
    ], now);
    expect(week.every((day) => !day.logged)).toBe(true);
  });
});

describe('ClientTodayHero', () => {
  it('renders the strip and the log CTA when today is not logged', async () => {
    mockGet.mockResolvedValue({ data: { data: { sessions: [] } } });
    renderHero();

    await waitFor(() => expect(screen.getByRole('img', { name: /This week/ })).toBeInTheDocument());
    expect(screen.getByText("Today's session is waiting.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Start today's session" }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('flips the CTA to progress when today already holds a session', async () => {
    mockGet.mockResolvedValue({ data: { data: { sessions: [session(new Date())] } } });
    renderHero();

    await waitFor(() => expect(screen.getByText('Today is logged — nice work.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'See your progress' }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/progress');
  });

  it('degrades to the CTA alone when the source fails', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    renderHero();

    expect(await screen.findByRole('button', { name: "Start today's session" })).toBeInTheDocument();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByRole('img', { name: /This week/ })).toBeNull();
  });
});
