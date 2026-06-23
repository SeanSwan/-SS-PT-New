import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useActivityTicker } from '@/hooks/social/useActivityTicker';

const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwtWithAlg = (alg: string) => [encode({ alg, typ: 'JWT' }), encode({ sub: '101' }), 'signature'].join('.');

function createSocketMock() {
  const handlers = new Map<string, Set<(...args: any[]) => void>>();

  const socket = {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      const eventHandlers = handlers.get(event) ?? new Set();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
      return socket;
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers.get(event)?.delete(handler);
      return socket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    emitEvent: (event: string, payload?: unknown) => {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };

  return socket;
}

describe('useActivityTicker', () => {
  beforeEach(() => {
    ioMock.mockReset();
    localStorage.clear();
  });

  it('does not open a socket connection without an auth token', () => {
    renderHook(() => useActivityTicker());

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('does not open a socket for unsigned mock-auth JWTs', () => {
    localStorage.setItem('token', jwtWithAlg('none'));

    renderHook(() => useActivityTicker());

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('uses polling-first transport with bounded reconnect behavior', () => {
    localStorage.setItem('token', 'test-token');
    const socket = createSocketMock();
    ioMock.mockReturnValue(socket);

    renderHook(() => useActivityTicker());

    // Vitest runs with import.meta.env.DEV === true, so the dev fallback URL
    // is expected here. Production-branch coverage is in the next test.
    expect(ioMock).toHaveBeenCalledWith(
      'http://localhost:10000',
      expect.objectContaining({
        auth: { token: 'test-token' },
        transports: ['polling', 'websocket'],
        upgrade: true,
        reconnectionAttempts: 2,
        timeout: 5000,
      }),
    );
  });

  it('uses the backend Render origin when production is served from the custom domain', () => {
    localStorage.setItem('token', 'test-token');
    const socket = createSocketMock();
    ioMock.mockReturnValue(socket);
    vi.stubEnv('DEV', '');
    vi.stubEnv('VITE_SOCKET_URL', '');
    vi.stubEnv('VITE_BACKEND_URL', 'https://sswanstudios.com');

    try {
      renderHook(() => useActivityTicker());

      expect(ioMock).toHaveBeenCalledWith(
        'https://ss-pt-new.onrender.com',
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket'],
          upgrade: false,
        }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('prefers VITE_SOCKET_URL override over any fallback', () => {
    localStorage.setItem('token', 'test-token');
    const socket = createSocketMock();
    ioMock.mockReturnValue(socket);
    vi.stubEnv('VITE_SOCKET_URL', 'https://sockets.example.com');

    try {
      renderHook(() => useActivityTicker());

      expect(ioMock).toHaveBeenCalledWith(
        'https://sockets.example.com',
        expect.objectContaining({ auth: { token: 'test-token' } }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('collects activity events and disconnects on unmount', () => {
    localStorage.setItem('token', 'test-token');
    const socket = createSocketMock();
    ioMock.mockReturnValue(socket);

    const { result, unmount } = renderHook(() => useActivityTicker());

    act(() => {
      socket.emitEvent('connect');
    });

    expect(socket.emit).toHaveBeenCalledWith('authenticate', { token: 'test-token' });
    expect(result.current.isConnected).toBe(false);

    act(() => {
      socket.emitEvent('authenticated');
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      socket.emitEvent('social:activity', {
        type: 'post_created',
        userId: 42,
        userName: 'Sean',
        timestamp: '2026-04-08T00:00:00.000Z',
      });
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toMatchObject({
      type: 'post_created',
      userId: 42,
      userName: 'Sean',
    });

    unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
