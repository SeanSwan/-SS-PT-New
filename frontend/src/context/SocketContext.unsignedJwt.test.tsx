
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, token: null as string | null },
  token: null as string | null,
  listeners: new Set<(token: string | null) => void>(),
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../services/productionTokenManager', () => ({
  ProductionTokenManager: {
    getToken: () => mocks.token,
    subscribe: (listener: (token: string | null) => void) => {
      mocks.listeners.add(listener);
      return () => mocks.listeners.delete(listener);
    },
  },
}));

import { SocketProvider } from './SocketContext';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwtWithAlg = (alg: string) => [encode({ alg, typ: 'JWT' }), encode({ sub: '101' }), 'signature'].join('.');

const createSocketMock = () => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
});

describe('SocketProvider unsigned JWT guard', () => {
  afterEach(() => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.token = null;
    mocks.token = null;
    mocks.listeners.clear();
    mocks.io.mockReset();
  });

  it('does not open a production socket for unsigned mock-auth JWTs', () => {
    const token = jwtWithAlg('none');
    mocks.auth.token = token;
    mocks.token = token;

    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    expect(mocks.io).not.toHaveBeenCalled();
  });

  it('still opens the realtime socket for signed JWT-shaped tokens', () => {
    const token = jwtWithAlg('HS256');
    const socket = createSocketMock();
    mocks.auth.token = token;
    mocks.token = token;
    mocks.io.mockReturnValue(socket);

    const { unmount } = render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    expect(mocks.io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token } }),
    );

    unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
