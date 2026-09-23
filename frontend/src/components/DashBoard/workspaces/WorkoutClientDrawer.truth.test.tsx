import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutClientDrawer from './WorkoutClientDrawer';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const makeDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const validClient = (id: number, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@example.test`,
});

const authState = {
  currentUser: { id: 'actor-a', role: 'admin' } as { id: string; role: string } | null,
  authAxios: { get: vi.fn() },
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authState.currentUser,
    authAxios: authState.authAxios,
  }),
}));

const renderDrawer = (isOpen = true, onSelect = vi.fn(), onClose = vi.fn()) => {
  const rendered = render(
    <WorkoutClientDrawer
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );
  return { ...rendered, onSelect, onClose };
};

describe('WorkoutClientDrawer truth contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = { id: 'actor-a', role: 'admin' };
    authState.authAxios.get.mockReset();
    vi.useRealTimers();
  });

  it('keeps a rejected canonical lookup unavailable and never calls the retired endpoint', async () => {
    authState.authAxios.get.mockRejectedValue(new Error('network unavailable'));

    renderDrawer();

    expect(await screen.findByRole('alert')).toHaveTextContent(/client list unavailable/i);
    expect(authState.authAxios.get).toHaveBeenCalledTimes(1);
    expect(authState.authAxios.get).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ params: { role: 'client', limit: 100 } }),
    );
    expect(authState.authAxios.get).not.toHaveBeenCalledWith(
      '/api/users',
      expect.anything(),
    );
    expect(screen.queryByText('No clients found')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('keeps supported empty and envelope responses distinct from malformed data', async () => {
    authState.authAxios.get.mockResolvedValueOnce({ data: { users: [] } });
    const first = renderDrawer();

    expect(await screen.findByText('No clients found')).toBeInTheDocument();
    first.unmount();

    authState.authAxios.get.mockResolvedValueOnce({ data: [validClient(2, 'Direct', 'Array')] });
    const second = renderDrawer();
    expect(await screen.findByRole('button', { name: /select direct array/i })).toBeInTheDocument();
    second.unmount();

    authState.authAxios.get.mockResolvedValueOnce({ data: { data: [validClient(3, 'Data', 'Envelope')] } });
    const third = renderDrawer();
    expect(await screen.findByRole('button', { name: /select data envelope/i })).toBeInTheDocument();
    third.unmount();

    authState.authAxios.get.mockResolvedValueOnce({ data: { users: [{ id: 'bad-id', firstName: 'Bad', lastName: 'Row' }] } });
    renderDrawer();
    expect(await screen.findByRole('alert')).toHaveTextContent(/client list unavailable/i);
    expect(screen.queryByRole('button', { name: /select bad row/i })).not.toBeInTheDocument();
  });

  it('does not treat an explicitly unsuccessful response with an empty users list as success', async () => {
    authState.authAxios.get.mockResolvedValueOnce({ data: { success: false, users: [] } });
    renderDrawer();
    expect(await screen.findByRole('alert')).toHaveTextContent(/client list unavailable/i);
    expect(screen.queryByText('No clients found')).not.toBeInTheDocument();
  });

  it('reports a canceled current request as unavailable while the drawer remains open', async () => {
    authState.authAxios.get.mockRejectedValueOnce({ code: 'ERR_CANCELED' });
    renderDrawer();
    expect(await screen.findByRole('alert')).toHaveTextContent(/client list unavailable/i);
    expect(screen.queryByText('No clients found')).not.toBeInTheDocument();
  });

  it('discards a late response after close and reopen so only the current request is selectable', async () => {
    const first = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    const second = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    authState.authAxios.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onClose = vi.fn();
    const { rerender } = renderDrawer(true, vi.fn(), onClose);

    rerender(<WorkoutClientDrawer isOpen={false} onClose={onClose} onSelect={vi.fn()} />);
    rerender(<WorkoutClientDrawer isOpen onClose={onClose} onSelect={vi.fn()} />);

    first.resolve({ data: { users: [validClient(10, 'Old', 'Owner')] } });
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: /select old owner/i })).not.toBeInTheDocument();

    second.resolve({ data: { users: [validClient(11, 'Current', 'Owner')] } });
    expect(await screen.findByRole('button', { name: /select current owner/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /select old owner/i })).not.toBeInTheDocument();
  });

  it('refetches for an actor change and prevents the previous actor from publishing rows', async () => {
    const oldActor = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    const newActor = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    authState.authAxios.get.mockReturnValueOnce(oldActor.promise).mockReturnValueOnce(newActor.promise);
    const onClose = vi.fn();
    const { rerender } = renderDrawer(true, vi.fn(), onClose);

    authState.currentUser = { id: 'actor-b', role: 'admin' };
    rerender(<WorkoutClientDrawer isOpen onClose={onClose} onSelect={vi.fn()} />);
    expect(authState.authAxios.get).toHaveBeenCalledTimes(2);

    oldActor.resolve({ data: { users: [validClient(20, 'Stale', 'Actor')] } });
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: /select stale actor/i })).not.toBeInTheDocument();

    newActor.resolve({ data: { users: [validClient(21, 'New', 'Actor')] } });
    expect(await screen.findByRole('button', { name: /select new actor/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /select stale actor/i })).not.toBeInTheDocument();
  });

  it('restores the mounted fence during StrictMode effect replay', async () => {
    authState.authAxios.get.mockResolvedValue({ data: { users: [validClient(22, 'Strict', 'Mode')] } });

    render(
      <StrictMode>
        <WorkoutClientDrawer isOpen onClose={vi.fn()} onSelect={vi.fn()} />
      </StrictMode>,
    );

    expect(await screen.findByRole('button', { name: /select strict mode/i })).toBeInTheDocument();
  });

  it('clears rows and avoids a directory request when the actor logs out', async () => {
    authState.authAxios.get.mockResolvedValueOnce({ data: { users: [validClient(23, 'Signed', 'Out')] } });
    const onClose = vi.fn();
    const { rerender } = renderDrawer(true, vi.fn(), onClose);
    expect(await screen.findByRole('button', { name: /select signed out/i })).toBeInTheDocument();

    authState.currentUser = null;
    rerender(<WorkoutClientDrawer isOpen onClose={onClose} onSelect={vi.fn()} />);

    expect(authState.authAxios.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /select signed out/i })).not.toBeInTheDocument();
  });

  it('retries the canonical request and allows selecting the recovered client', async () => {
    authState.authAxios.get
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce({ data: { users: [validClient(30, 'Recovered', 'Client')] } });
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderDrawer(true, onSelect, onClose);

    fireEvent.click(await screen.findByRole('button', { name: /retry/i }));
    const row = await screen.findByRole('button', { name: /select recovered client/i });
    fireEvent.click(row);

    expect(authState.authAxios.get).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 30 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not expose old selectable rows while a retry is loading and clears its focus timer on unmount', async () => {
    const initial = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    const retry = makeDeferred<{ data: { users: Array<Record<string, unknown>> } }>();
    authState.authAxios.get.mockReturnValueOnce(initial.promise).mockReturnValueOnce(retry.promise);
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender, unmount } = renderDrawer(true);

    await act(async () => {
      initial.resolve({ data: { users: [validClient(40, 'Existing', 'Client')] } });
      await initial.promise;
    });
    expect(screen.getByRole('button', { name: /select existing client/i })).toBeInTheDocument();

    rerender(<WorkoutClientDrawer isOpen={false} onClose={vi.fn()} onSelect={vi.fn()} />);
    rerender(<WorkoutClientDrawer isOpen onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /select existing client/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading clients/i);

    await act(async () => {
      retry.resolve({ data: { users: [validClient(41, 'Fresh', 'Client')] } });
      await retry.promise;
    });
    expect(screen.getByRole('button', { name: /select fresh client/i })).toBeInTheDocument();

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
