
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, token: '' as string | null },
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

import { SocketProvider } from './SocketContext';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwtWithAlg = (alg: string) => [encode({ alg, typ: 'JWT' }), encode({ sub: '101' }), 'signature'].join('.');

const createSocketMock = () => ({
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
});

describe('SocketProvider unsigned JWT guard', () => {
  afterEach(() => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.token = '';
    mocks.io.mockReset();
  });

  it('does not open a production socket for unsigned mock-auth JWTs', () => {
    mocks.auth.token = jwtWithAlg('none');

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
