/**
 * NextBestActionCard tests (Phase 1.5a)
 *
 * Locks: ready-state rendering (title/message/CTA/constraints/secondary),
 * truthful unavailable/retry recovery, the always-present rules-transparency
 * disclosure, source-owned CTA routing, the onLogWorkout override for
 * log-class CTAs, and the two home mounts (source truth).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import NextBestActionCard, { NBA_DISCLOSURE_COPY } from './NextBestActionCard';

const mockNavigate = vi.fn();
const mockUsePulse = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock('../../hooks/analytics/useProgressPulse', () => ({
  default: () => mockUsePulse(),
  useProgressPulse: () => mockUsePulse(),
}));

const readyPulse = (nbaOver = {}) => ({
  status: 'ready',
  pulse: {
    nextBestAction: {
      primary: {
        code: 'plan_next',
        priority: 3.5,
        title: 'Today: Lower Body Strength',
        message: 'Goblet Squat + 4 more is on your plan for today.',
        cta: { label: "Start today's workout", href: '/dashboard/client/workouts' },
      },
      secondary: [
        { code: 'balance_pull', priority: 4, title: 'Add pulling work', message: 'm', cta: null },
      ],
      constraints: { regions: ['lower_back'], note: 'Active discomfort noted (lower_back). Choose comfortable ranges and skip movements that aggravate it today.' },
      meta: { engine: 'rules', version: 2 },
      ...nbaOver,
    },
  },
  refetch: vi.fn(),
});

describe('NextBestActionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the engine primary with CTA, constraints caution, secondary chips, and the disclosure', () => {
    mockUsePulse.mockReturnValue(readyPulse());
    render(<NextBestActionCard />);

    expect(screen.getByText('Today: Lower Body Strength')).toBeInTheDocument();
    expect(screen.getByText(/Goblet Squat \+ 4 more/)).toBeInTheDocument();
    expect(screen.getByText(/comfortable ranges/i)).toBeInTheDocument();
    expect(screen.getByText('Add pulling work')).toBeInTheDocument();
    expect(screen.getByText(NBA_DISCLOSURE_COPY)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start today's workout/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
  });

  it('routes log-class CTAs through the onLogWorkout override (role-aware paths)', () => {
    mockUsePulse.mockReturnValue(readyPulse());
    const onLogWorkout = vi.fn();
    render(<NextBestActionCard onLogWorkout={onLogWorkout} />);

    fireEvent.click(screen.getByRole('button', { name: /start today's workout/i }));
    expect(onLogWorkout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a truthful unavailable state and retries the hook without a stale CTA', () => {
    const refetch = vi.fn();
    mockUsePulse.mockReturnValue({ status: 'error', pulse: null, liteNba: null, refetch });
    render(<NextBestActionCard />);

    expect(screen.getByText(/guidance unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/could not load your next step/i)).toBeInTheDocument();
    expect(screen.getByText(NBA_DISCLOSURE_COPY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves source-owned rest guidance navigation', () => {
    mockUsePulse.mockReturnValue(readyPulse({
      primary: {
        code: 'rest_day',
        priority: 1,
        title: 'Take a recovery day',
        message: 'Choose gentle movement or rest.',
        cta: { label: 'Open recovery plan', href: '/dashboard/client/recovery' },
      },
    }));
    render(<NextBestActionCard />);
    fireEvent.click(screen.getByRole('button', { name: /open recovery plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/recovery');
  });

  it('does not render or navigate malformed guidance from a defensive hook double', () => {
    const refetch = vi.fn();
    mockUsePulse.mockReturnValue({
      status: 'ready',
      pulse: {
        nextBestAction: {
          primary: { code: 'unsafe', priority: 1, title: ['bad'], message: { bad: true }, cta: { label: 'Unsafe', href: 'https://unsafe.example' } },
          secondary: [{ code: 'bad-secondary', priority: 1, title: ['bad'], message: 'bad', cta: null }],
        },
      },
      liteNba: null,
      refetch,
    });
    render(<NextBestActionCard />);
    expect(screen.getByText(/guidance unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unsafe/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders a loading skeleton while fetching', () => {
    mockUsePulse.mockReturnValue({ status: 'loading', pulse: null, refetch: vi.fn() });
    const { container } = render(<NextBestActionCard />);
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(screen.getByText(NBA_DISCLOSURE_COPY)).toBeInTheDocument();
  });

  it('is mounted on both canonical homes (source truth)', () => {
    const userHome = readFileSync(resolve(__dirname, '../UserDashboard/components/HomeTabNextBestAction.tsx'), 'utf8');
    const clientHome = readFileSync(resolve(__dirname, '../UserDashboard/components/ClientDashboardHome.tsx'), 'utf8');
    expect(userHome).toContain("import NextBestActionCard from '../../NextBestAction/NextBestActionCard'");
    expect(userHome).toContain('<NextBestActionCard bare hideHeader onLogWorkout={onLogWorkout} />');
    expect(clientHome).toContain("import NextBestActionCard from '../../NextBestAction/NextBestActionCard'");
    expect(clientHome).toContain('<NextBestActionCard bare hideHeader onLogWorkout={props.onLogWorkout} />');
  });
});
