import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import TrainerHomeNextActionCard from './TrainerHomeNextActionCard';

const nextClientSession: TrainerSession = {
  id: 88,
  sessionDate: '2099-05-31T16:00:00.000Z',
  duration: 45,
  userId: 42,
  client: {
    id: 42,
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  sessionType: {
    creditsRequired: 2,
  },
  status: 'scheduled',
};

describe('TrainerHomeNextActionCard', () => {
  it('teaches the next-client Coach Log Progress loop with a direct client-progress route', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(<TrainerHomeNextActionCard session={nextClientSession} onNavigate={onNavigate} />);

    const flow = screen.getByRole('list', { name: /trainer today flow/i });
    expect(within(flow).getByText('Coach')).toBeInTheDocument();
    expect(within(flow).getByText('Prime session')).toBeInTheDocument();
    expect(within(flow).getByText('Log')).toBeInTheDocument();
    expect(within(flow).getByText('Save proof')).toBeInTheDocument();
    expect(within(flow).getByText('Progress')).toBeInTheDocument();
    expect(within(flow).getByText('Review next')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /review progress for ada lovelace/i }));

    const route = onNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');

    expect(url.pathname).toBe('/dashboard/trainer/client-progress');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('source')).toBe('trainer-overview');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
  });
});
