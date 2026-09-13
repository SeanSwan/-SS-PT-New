import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type Handler = (...args: any[]) => void;
  type MockSocket = {
    on: (event: string, handler: Handler) => MockSocket;
    off: (event: string, handler?: Handler) => MockSocket;
    getHandler: (event: string) => Handler | undefined;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    trigger: (event: string, payload?: unknown) => void;
  };
  const auth = { isAuthenticated: true, token: null as string | null };
  let token: string | null = null;
  const listeners = new Set<(value: string | null) => void>();
  const sockets: MockSocket[] = [];
  const io = vi.fn(() => {
    const handlers = new Map<string, Set<Handler>>();
    const socket = {
      on(event: string, handler: Handler) {
        const set = handlers.get(event) ?? new Set<Handler>();
        set.add(handler);
        handlers.set(event, set);
        return socket;
      },
      off: vi.fn((event: string, handler?: Handler) => {
        if (!handler) handlers.delete(event);
        else handlers.get(event)?.delete(handler);
        return socket;
      }),
      getHandler(event: string) {
        return handlers.get(event)?.values().next().value;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
      trigger(event: string, payload?: unknown) {
        handlers.get(event)?.forEach(handler => handler(payload));
      },
    } satisfies MockSocket;
    sockets.push(socket);
    return socket;
  });
  return {
    auth,
    sockets,
    io,
    listeners,
    get token() { return token; },
    set token(value: string | null) { token = value; },
    publish(value: string | null) {
      token = value;
      listeners.forEach(listener => listener(value));
    },
  };
});

vi.mock('socket.io-client', () => ({ io: mocks.io }));
vi.mock('./AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../services/productionTokenManager', () => ({
  ProductionTokenManager: {
    getToken: () => mocks.token,
    subscribe: (listener: (value: string | null) => void) => {
      mocks.listeners.add(listener);
      return () => mocks.listeners.delete(listener);
    },
  },
}));

import { SocketProvider, useSocket } from './SocketContext';

const signedToken = (subject: string) => `header.${subject}.signature`;

const Status = () => {
  const { isConnected } = useSocket();
  return <output data-testid="connected">{String(isConnected)}</output>;
};

const renderProvider = () => render(
  <SocketProvider><Status /></SocketProvider>,
);

describe('SocketProvider canonical token lifecycle', () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.token = null;
    mocks.token = null;
    mocks.listeners.clear();
    mocks.sockets.splice(0);
    mocks.io.mockClear();
  });

  it('authenticates the current canonical token and rotates without AuthContext rerender', () => {
    const firstToken = signedToken('first');
    mocks.auth.token = firstToken;
    mocks.token = firstToken;
    renderProvider();
    const firstSocket = mocks.sockets[0];
    expect(mocks.io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ auth: { token: firstToken } }));

    act(() => firstSocket.trigger('connect'));
    expect(firstSocket.emit).toHaveBeenCalledWith('authenticate', { token: firstToken });
    const staleAuthenticated = firstSocket.getHandler('authenticated');
    expect(staleAuthenticated).toBeTypeOf('function');

    const secondToken = signedToken('second');
    act(() => mocks.publish(secondToken));
    const secondSocket = mocks.sockets[1];
    expect(firstSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.io).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ auth: { token: secondToken } }));

    act(() => staleAuthenticated?.());
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    act(() => secondSocket.trigger('authenticated'));
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
  });

  it('disposes the socket on canonical logout and does not reconnect', () => {
    const token = signedToken('logout');
    mocks.auth.token = token;
    mocks.token = token;
    const { unmount } = renderProvider();
    const socket = mocks.sockets[0];

    act(() => mocks.publish(null));
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(mocks.io).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('disconnects and clears state when the current socket rejects authentication', () => {
    const token = signedToken('rejected');
    mocks.auth.token = token;
    mocks.token = token;
    const { unmount } = renderProvider();
    const socket = mocks.sockets[0];

    act(() => socket.trigger('auth_error', { message: 'expired' }));

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    unmount();
  });

  it('removes socket listeners on unmount so late acknowledgements cannot update state', () => {
    const token = signedToken('unmount');
    mocks.auth.token = token;
    mocks.token = token;
    const { unmount } = renderProvider();
    const socket = mocks.sockets[0];
    unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.off).toHaveBeenCalled();
    act(() => socket.trigger('authenticated'));
  });
});
