import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from './CartContextProvider';
import { useCart } from './cartContextState';

const { authState, getMock } = vi.hoisted(() => ({
  authState: {
    current: {
      isAuthenticated: true,
      token: 'token-a',
      user: { id: '101', role: 'client' },
    },
  },
  getMock: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => authState.current,
}));

vi.mock('../services/api.service', () => ({
  default: {
    get: getMock,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/utils/logApiError', () => ({ logApiError: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const cartResponse = (id: number) => ({
  data: {
    id,
    status: 'active',
    items: [],
    total: 0,
    totalSessions: 0,
    itemCount: 0,
  },
});

const CartProbe = () => {
  const { cart, loading } = useCart();
  return <output data-testid="cart-state">{loading ? 'loading' : cart?.id ?? 'empty'}</output>;
};

describe('CartProvider user isolation', () => {
  beforeEach(() => {
    getMock.mockReset();
    authState.current = {
      isAuthenticated: true,
      token: 'token-a',
      user: { id: '101', role: 'client' },
    };
  });

  it('refetches on user change and ignores the prior user response when it arrives late', async () => {
    const firstUserRequest = deferred<{ data: unknown }>();
    const secondUserRequest = deferred<{ data: unknown }>();
    getMock
      .mockReturnValueOnce(firstUserRequest.promise)
      .mockReturnValueOnce(secondUserRequest.promise);

    const view = render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));

    authState.current = {
      isAuthenticated: true,
      token: 'token-b',
      user: { id: '202', role: 'client' },
    };
    view.rerender(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));

    await act(async () => secondUserRequest.resolve(cartResponse(202)));
    await waitFor(() => expect(screen.getByTestId('cart-state')).toHaveTextContent('202'));

    await act(async () => firstUserRequest.resolve(cartResponse(101)));
    expect(screen.getByTestId('cart-state')).toHaveTextContent('202');
  });
});
