import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationRealtime } from './useGamificationRealtime';

const mocks = vi.hoisted(() => {
  type Handler = (...args: any[]) => void;
  type MockSocket = {
    on: (event: string, handler: Handler) => MockSocket;
    off: (event: string) => MockSocket;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    emitEvent: (event: string, payload: unknown) => void;
  };
  const auth = {
    token: 'token-a',
    user: { id: 'account-a' },
  };
  const sockets: MockSocket[] = [];
  const ioMock = vi.fn(() => {
    const handlers = new Map<string, Set<Handler>>();
    const socket = {
      on(event: string, handler: Handler) {
        const eventHandlers = handlers.get(event) ?? new Set<Handler>();
        eventHandlers.add(handler);
        handlers.set(event, eventHandlers);
        return socket;
      },
      off(event: string) {
        handlers.delete(event);
        return socket;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
      emitEvent(event: string, payload: unknown) {
        handlers.get(event)?.forEach(handler => handler(payload));
      },
    } satisfies MockSocket;
    sockets.push(socket);
    return socket;
  });
  const toast = vi.fn();
  const invalidateQueries = vi.fn();
  const triggerLevelUp = vi.fn();
  const triggerXPPop = vi.fn();
  const triggerAchievement = vi.fn();
  const triggerStreak = vi.fn();
  const tokenObservers = new Set<(token: string | null) => void>();
  const tokenStore = { token: 'token-a' as string | null };
  return {
    auth,
    sockets,
    ioMock,
    toast,
    invalidateQueries,
    triggerLevelUp,
    triggerXPPop,
    triggerAchievement,
    triggerStreak,
    tokenObservers,
    tokenStore,
  };
});

vi.mock('socket.io-client', () => ({ io: mocks.ioMock }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../context/CelebrationContext', () => ({
  useCelebrationOptional: () => ({
    triggerLevelUp: mocks.triggerLevelUp,
    triggerXPPop: mocks.triggerXPPop,
    triggerAchievement: mocks.triggerAchievement,
    triggerStreak: mocks.triggerStreak,
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('../../services/api.service', () => ({
  ProductionTokenManager: {
    getToken: () => mocks.tokenStore.token,
    subscribe: (observer: (token: string | null) => void) => {
      mocks.tokenObservers.add(observer);
      return () => mocks.tokenObservers.delete(observer);
    },
  },
}));
vi.mock('../../utils/realtimeSocketUrl', () => ({
  resolveRealtimeSocketUrl: () => 'http://realtime.test',
  resolveRealtimeSocketTransportOptions: () => ({ transports: ['websocket'] }),
}));
vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('useGamificationRealtime lifecycle truth', () => {
  beforeEach(() => {
    mocks.auth.token = 'token-a';
    mocks.auth.user = { id: 'account-a' };
    mocks.sockets.splice(0);
    mocks.ioMock.mockClear();
    mocks.toast.mockClear();
    mocks.invalidateQueries.mockClear();
    mocks.triggerLevelUp.mockClear();
    mocks.triggerXPPop.mockClear();
    mocks.triggerAchievement.mockClear();
    mocks.triggerStreak.mockClear();
    mocks.tokenStore.token = 'token-a';
  });

  it('ignores stale sockets, preserves level dedup across token refresh, and resets on owner change', () => {
    const { rerender } = renderHook(() => useGamificationRealtime());
    const firstSocket = mocks.sockets[0];

    act(() => {
      firstSocket.emitEvent('gamification:level_up', { userId: 'account-a', newLevel: 4 });
    });
    expect(mocks.triggerLevelUp).toHaveBeenCalledTimes(1);

    act(() => {
      mocks.auth.token = 'token-a-refreshed';
      mocks.tokenStore.token = 'token-a-refreshed';
      rerender();
    });
    const refreshedSocket = mocks.sockets[1];
    expect(refreshedSocket).toBeDefined();

    act(() => {
      firstSocket.emitEvent('gamification:level_up', { userId: 'account-a', newLevel: 5 });
      refreshedSocket.emitEvent('gamification:level_up', { userId: 'account-a', newLevel: 4 });
    });
    expect(mocks.triggerLevelUp).toHaveBeenCalledTimes(1);

    act(() => {
      mocks.auth.user = { id: 'account-b' };
      mocks.auth.token = 'token-b';
      mocks.tokenStore.token = 'token-b';
      rerender();
    });
    const secondOwnerSocket = mocks.sockets[2];
    act(() => {
      secondOwnerSocket.emitEvent('gamification:level_up', { userId: 'account-b', newLevel: 1 });
    });
    expect(mocks.triggerLevelUp).toHaveBeenCalledTimes(2);

    act(() => {
      mocks.auth.user = { id: 'account-a' };
      mocks.auth.token = 'token-a-again';
      mocks.tokenStore.token = 'token-a-again';
      rerender();
    });
    const accountAAgainSocket = mocks.sockets[3];
    act(() => {
      accountAAgainSocket.emitEvent('gamification:level_up', { userId: 'account-a', newLevel: 1 });
    });
    expect(mocks.triggerLevelUp).toHaveBeenCalledTimes(3);
  });

  it('rejects foreign and malformed reward events before toast or query effects', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];

    act(() => {
      socket.emitEvent('gamification:points_awarded', { userId: 'account-b', points: 20 });
      socket.emitEvent('gamification:points_awarded', { userId: 'account-a', points: [] });
      socket.emitEvent('gamification:workout_completed', { userId: 'account-a', points: 0 });
      socket.emitEvent('gamification:level_up', { userId: 'account-a', newLevel: 'not-a-level' });
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.triggerLevelUp).not.toHaveBeenCalled();

    act(() => {
      socket.emitEvent('gamification:points_awarded', { userId: 'account-a', points: 20 });
    });
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('rotates on canonical refresh even when AuthContext has not rerendered, and disconnects on logout', () => {
    const { unmount } = renderHook(() => useGamificationRealtime());
    const firstSocket = mocks.sockets[0];
    act(() => {
      mocks.tokenStore.token = 'canonical-refresh';
      mocks.tokenObservers.forEach(observer => observer('canonical-refresh'));
    });
    expect(mocks.ioMock).toHaveBeenLastCalledWith('http://realtime.test', expect.objectContaining({ auth: { token: 'canonical-refresh' } }));
    expect(firstSocket.disconnect).toHaveBeenCalled();
    const latest = mocks.sockets.at(-1)!;
    act(() => {
      mocks.tokenStore.token = null;
      mocks.tokenObservers.forEach(observer => observer(null));
    });
    expect(latest.disconnect).toHaveBeenCalled();
    unmount();
    expect(mocks.tokenObservers.size).toBe(0);
  });

  it('celebrates a committed workout XP event once across token rotation and replay', () => {
    renderHook(() => useGamificationRealtime());
    const event = { userId: 'account-a', sourceId: 'workout-51', points: 20, timestamp: '2026-09-12T21:00:00Z' };
    act(() => {
      mocks.sockets[0].emitEvent('gamification:workout_completed', event);
      mocks.sockets[0].emitEvent('gamification:workout_completed', event);
      mocks.tokenStore.token = 'canonical-refresh';
      mocks.tokenObservers.forEach(observer => observer('canonical-refresh'));
    });
    act(() => mocks.sockets.at(-1)!.emitEvent('gamification:workout_completed', event));
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.triggerXPPop).toHaveBeenCalledExactlyOnceWith(20);
  });

  it('deduplicates XP across points/workout aliases while allowing a later named achievement toast', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];
    const pointsEvent = {
      userId: 'account-a',
      eventId: 'point-transaction:91',
      transactionId: 91,
      sourceId: 51,
      points: 20,
    };

    act(() => {
      socket.emitEvent('gamification:points_awarded', pointsEvent);
      socket.emitEvent('gamification:workout_completed', pointsEvent);
      socket.emitEvent('gamification:achievement_unlocked', {
        ...pointsEvent,
        achievementName: 'Five Workouts',
      });
    });

    expect(mocks.triggerXPPop).toHaveBeenCalledExactlyOnceWith(20);
    expect(mocks.toast).toHaveBeenCalledTimes(2);
    expect(mocks.toast).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'Achievement unlocked',
      description: expect.stringContaining('Five Workouts'),
    }));
    expect(mocks.triggerAchievement).toHaveBeenCalledExactlyOnceWith('Five Workouts');
    expect(mocks.triggerStreak).not.toHaveBeenCalled();
  });

  it('does not suppress distinct committed transactions that share a source id', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];

    act(() => {
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', eventId: 'point-transaction:101', transactionId: 101, sourceId: 77, points: 5,
      });
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', eventId: 'point-transaction:102', transactionId: 102, sourceId: 77, points: 8,
      });
    });

    expect(mocks.triggerXPPop).toHaveBeenNthCalledWith(1, 5);
    expect(mocks.triggerXPPop).toHaveBeenNthCalledWith(2, 8);
    expect(mocks.triggerXPPop).toHaveBeenCalledTimes(2);
  });

  it('namespaces legacy source ids so distinct source types both render', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];

    act(() => {
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', source: 'workout_completion', sourceId: 7, points: 5,
      });
      socket.emitEvent('gamification:achievement_unlocked', {
        userId: 'account-a', source: 'achievement_earned', sourceId: 7, points: 8,
      });
    });

    expect(mocks.triggerXPPop).toHaveBeenNthCalledWith(1, 5);
    expect(mocks.triggerXPPop).toHaveBeenNthCalledWith(2, 8);
    expect(mocks.triggerXPPop).toHaveBeenCalledTimes(2);
  });

  it('uses truthful generic feedback when a streak reward has no authoritative day count', () => {
    renderHook(() => useGamificationRealtime());

    act(() => {
      mocks.sockets[0].emitEvent('gamification:streak_milestone', {
        userId: 'account-a', eventId: 'point-transaction:103', transactionId: 103, points: 5,
      });
    });

    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Rewards profile updated',
      description: expect.stringContaining('5 XP'),
    }));
    expect(mocks.toast.mock.calls[0][0].description).not.toMatch(/streak milestone/i);
  });

  it('renders real streak days and keeps semantic feedback visible without XP fabrication', () => {
    renderHook(() => useGamificationRealtime());

    act(() => {
      mocks.sockets[0].emitEvent('gamification:streak_milestone', {
        userId: 'account-a', eventId: 'point-transaction:104', transactionId: 104, points: 7, streakDays: 12,
      });
    });

    expect(mocks.triggerXPPop).toHaveBeenCalledExactlyOnceWith(7);
    expect(mocks.triggerStreak).toHaveBeenCalledExactlyOnceWith(12);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Streak milestone reached',
      description: expect.stringContaining('12-day streak'),
    }));
  });

  it('keeps replay state bounded to 256 durable identities and evicts the oldest', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];

    act(() => {
      for (let transactionId = 1; transactionId <= 257; transactionId += 1) {
        socket.emitEvent('gamification:points_awarded', {
          userId: 'account-a',
          eventId: `point-transaction:${transactionId}`,
          transactionId,
          points: 1,
        });
      }
    });

    expect(mocks.triggerXPPop).toHaveBeenCalledTimes(257);
    act(() => {
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', eventId: 'point-transaction:1', transactionId: 1, points: 1,
      });
    });
    expect(mocks.triggerXPPop).toHaveBeenCalledTimes(258);
  });

  it('rejects spend events, malformed durable ids, and fractional XP without fallback fabrication', () => {
    renderHook(() => useGamificationRealtime());
    const socket = mocks.sockets[0];

    act(() => {
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', transactionId: {}, points: 20,
      });
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', transactionId: 205, transactionType: 'spend', points: 20,
      });
      socket.emitEvent('gamification:points_awarded', {
        userId: 'account-a', transactionId: 206, points: 2.5, xpEarned: 99,
      });
    });

    expect(mocks.triggerXPPop).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
