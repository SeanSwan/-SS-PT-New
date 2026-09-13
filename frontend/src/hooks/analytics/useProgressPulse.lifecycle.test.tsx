import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressPulse } from './useProgressPulse';
import NextBestActionCard from '../../components/NextBestAction/NextBestActionCard';

const authState = vi.hoisted(() => ({
  user: { id: 41 } as { id: number } | null,
  authAxios: { get: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const pulse = (label: string) => ({
  streak: { weeklyCurrent: 1, weeklyLongest: 2, weekTarget: 3, daysThisWeek: 1, currentWeekPending: false },
  pushPull: { pushVolume: 1, pullVolume: 1, ratio: 1, label: 'balanced' as const },
  variety: { score: 1, distinctExercises: 2, patternsCovered: 2, patternsTotal: 2 },
  volume: { thisWeek: 1, priorWeek: 1, deltaPct: 0 },
  lastWorkout: { date: '2026-09-12', daysAgo: 0 },
  nextBestAction: {
    primary: { code: 'plan_next', priority: 1, title: `${label} title`, message: `${label} message`, cta: { label: 'Open plan', href: '/dashboard/client/workouts' } },
    secondary: [],
  },
});

const lite = (label: string) => ({
  success: true,
  data: {
    nextBestAction: {
      primary: { code: 'recovery_day', priority: 1, title: `${label} lite`, message: `${label} lite message`, cta: { label: 'Open recovery', href: '/dashboard/client/recovery' } },
      secondary: [],
    },
  },
});

const successPulse = (label: string) => ({ success: true, data: pulse(label) });

describe('useProgressPulse lifecycle ownership', () => {
  beforeEach(() => {
    authState.user = { id: 41 };
    authState.authAxios = { get: vi.fn() };
  });

  it('recovers the actual card for owner B without executing owner A lite guidance', async () => {
    authState.authAxios.get.mockRejectedValueOnce(new Error('tier gated')).mockResolvedValueOnce({ data: lite('owner A') });
    const Location = () => <output aria-label="Current route">{useLocation().pathname}</output>;
    const Surface = () => <MemoryRouter><NextBestActionCard /><Location /></MemoryRouter>;
    const view = render(<Surface />);
    await screen.findByText('owner A lite');
    authState.user = { id: 42 };
    authState.authAxios.get.mockResolvedValueOnce({ data: { success: false } }).mockResolvedValueOnce({ data: successPulse('owner B') });
    view.rerender(<Surface />);
    await screen.findByText('Guidance unavailable');
    expect(screen.queryByText('owner A lite')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open recovery' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('owner B title');
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent('/');
    expect(authState.authAxios.get).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole('button', { name: 'Open plan' }));
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent('/dashboard/client/workouts');
  });

  it('clears lite guidance on logout and ignores a late previous-owner fallback', async () => {
    const liteResponse = deferred<{ data: ReturnType<typeof lite> }>();
    authState.authAxios.get.mockRejectedValueOnce(new Error('tier gated')).mockReturnValueOnce(liteResponse.promise);
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    const view = render(<Probe />);
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(2));

    act(() => {
      liteResponse.resolve({ data: lite('owner A') });
    });
    await waitFor(() => expect(latest.status).toBe('lite'));
    expect(latest.liteNba?.primary.title).toBe('owner A lite');

    act(() => {
      authState.user = null;
      view.rerender(<Probe />);
    });
    await waitFor(() => expect(latest.status).toBe('error'));
    expect(latest.pulse).toBeNull();
    expect(latest.liteNba).toBeNull();
  });

  it('does not publish a late paid response after the actor changes', async () => {
    const ownerA = deferred<{ data: ReturnType<typeof successPulse> }>();
    const ownerB = deferred<{ data: ReturnType<typeof successPulse> }>();
    authState.authAxios.get.mockReturnValueOnce(ownerA.promise).mockReturnValueOnce(ownerB.promise);
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    const view = render(<Probe />);
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(1));

    act(() => {
      authState.user = { id: 42 };
      view.rerender(<Probe />);
    });
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(2));

    await act(async () => {
      ownerA.resolve({ data: successPulse('owner A') });
      await ownerA.promise;
    });
    expect(latest.status).toBe('loading');
    expect(latest.pulse).toBeNull();

    act(() => {
      ownerB.resolve({ data: successPulse('owner B') });
    });
    await waitFor(() => expect(latest.status).toBe('ready'));
    expect(latest.pulse?.nextBestAction.primary.title).toBe('owner B title');
  });

  it('does not publish a late lite response after the actor changes', async () => {
    const ownerALite = deferred<{ data: ReturnType<typeof lite> }>();
    const ownerB = deferred<{ data: ReturnType<typeof successPulse> }>();
    authState.authAxios.get
      .mockRejectedValueOnce(new Error('tier gated'))
      .mockReturnValueOnce(ownerALite.promise)
      .mockReturnValueOnce(ownerB.promise);
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    const view = render(<Probe />);
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(2));

    act(() => {
      authState.user = { id: 42 };
      view.rerender(<Probe />);
    });
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(3));
    act(() => {
      ownerALite.resolve({ data: lite('owner A') });
    });
    await Promise.resolve();
    expect(latest.status).toBe('loading');
    expect(latest.liteNba).toBeNull();

    act(() => {
      ownerB.resolve({ data: successPulse('owner B') });
    });
    await waitFor(() => expect(latest.status).toBe('ready'));
    expect(latest.liteNba).toBeNull();
  });

  it('invalidates an earlier response when the auth client instance changes', async () => {
    const oldClient = authState.authAxios;
    const oldResponse = deferred<{ data: ReturnType<typeof successPulse> }>();
    const newClient = { get: vi.fn() };
    const newResponse = deferred<{ data: ReturnType<typeof successPulse> }>();
    oldClient.get.mockReturnValueOnce(oldResponse.promise);
    newClient.get.mockReturnValueOnce(newResponse.promise);
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    const view = render(<Probe />);
    await waitFor(() => expect(oldClient.get).toHaveBeenCalledTimes(1));
    act(() => {
      authState.authAxios = newClient;
      view.rerender(<Probe />);
    });
    await waitFor(() => expect(newClient.get).toHaveBeenCalledTimes(1));
    act(() => {
      oldResponse.resolve({ data: successPulse('old client') });
    });
    await Promise.resolve();
    expect(latest.status).toBe('loading');
    expect(latest.pulse).toBeNull();
    act(() => {
      newResponse.resolve({ data: successPulse('new client') });
    });
    await waitFor(() => expect(latest.status).toBe('ready'));
    expect(latest.pulse?.nextBestAction.primary.title).toBe('new client title');
  });

  it('clears current guidance and ignores a late response when refetch starts a new generation', async () => {
    const first = deferred<{ data: ReturnType<typeof successPulse> }>();
    const retry = deferred<{ data: ReturnType<typeof successPulse> }>();
    authState.authAxios.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    render(<Probe />);
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(1));
    act(() => latest.refetch());
    await waitFor(() => expect(authState.authAxios.get).toHaveBeenCalledTimes(2));
    expect(latest.status).toBe('loading');
    expect(latest.pulse).toBeNull();
    expect(latest.liteNba).toBeNull();

    await act(async () => {
      first.resolve({ data: successPulse('stale') });
      await first.promise;
    });
    expect(latest.status).toBe('loading');
    expect(latest.pulse).toBeNull();

    act(() => {
      retry.resolve({ data: successPulse('fresh') });
    });
    await waitFor(() => expect(latest.status).toBe('ready'));
    expect(latest.pulse?.nextBestAction.primary.title).toBe('fresh title');
  });

  it('rejects malformed paid guidance without exposing actionable data', async () => {
    authState.authAxios.get
      .mockResolvedValueOnce({ data: { success: true, data: { ...pulse('bad'), nextBestAction: { ...pulse('bad').nextBestAction, primary: { ...pulse('bad').nextBestAction.primary, cta: { label: 'bad', href: 'https://unsafe.example' } } } } } });
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    render(<Probe />);
    await waitFor(() => expect(latest.status).toBe('error'));
    expect(latest.pulse).toBeNull();
    expect(latest.liteNba).toBeNull();
  });

  it('rejects malformed lite guidance after a failed full request', async () => {
    authState.authAxios.get
      .mockRejectedValueOnce(new Error('tier gated'))
      .mockResolvedValueOnce({ data: { success: true, data: { nextBestAction: { primary: [], secondary: [] } } } });
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    render(<Probe />);
    await waitFor(() => expect(latest.status).toBe('error'));
    expect(latest.pulse).toBeNull();
    expect(latest.liteNba).toBeNull();
  });

  it('returns an error with no data when identity is missing', async () => {
    authState.user = null;
    let latest!: ReturnType<typeof useProgressPulse>;
    const Probe = () => {
      latest = useProgressPulse();
      return <span>{latest.status}</span>;
    };
    render(<Probe />);
    await waitFor(() => expect(latest.status).toBe('error'));
    expect(authState.authAxios.get).not.toHaveBeenCalled();
    expect(latest.pulse).toBeNull();
    expect(latest.liteNba).toBeNull();
  });
});
