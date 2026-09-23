import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { ProductionTokenManager } from '@/services/productionTokenManager';
import { useSocket } from './useSocket';

const ioMock = vi.hoisted(() => vi.fn());
vi.mock('socket.io-client', () => ({ io: ioMock }));

const SOURCE = readFileSync(resolve(process.cwd(), 'src/hooks/useSocket.ts'), 'utf8');

describe('useSocket lifecycle contract', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ProductionTokenManager.clearAuthData();
  });

  it('observes the canonical token manager instead of a nonexistent window event', () => {
    expect(SOURCE).toContain('ProductionTokenManager.subscribe');
    expect(SOURCE).not.toContain("window.addEventListener('token_refreshed'");
  });

  it('guards late async socket creation and performs shared-owner cleanup', () => {
    expect(SOURCE).toContain('cancelledRef');
    expect(SOURCE).toContain('globalCreatePromise');
    expect(SOURCE).toContain('removeAllListeners');
    expect(SOURCE).toContain('disconnect');
  });

  it('disconnects a socket created after its owner unmounts', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    ProductionTokenManager.setToken('owner-token');
    const { unmount } = renderHook(() => useSocket());

    unmount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('rotates the shared connection on canonical token changes and cleans the latest owner', async () => {
    const first = fakeSocket();
    const second = fakeSocket();
    ioMock.mockReturnValueOnce(first).mockReturnValueOnce(second);
    ProductionTokenManager.setToken('first-token');
    const { unmount } = renderHook(() => useSocket());
    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));

    act(() => { ProductionTokenManager.setToken('second-token'); });
    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(2));

    expect(first.disconnect).toHaveBeenCalled();
    expect(second).toBeDefined();
    unmount();
    expect(second.disconnect).toHaveBeenCalled();
  });

  it('shares a connecting socket with a later owner and keeps it until the last owner leaves', async () => {
    const socket = fakeSocket();
    socket.disconnected = true;
    ioMock.mockReturnValue(socket);
    ProductionTokenManager.setToken('shared-token');
    const first = renderHook(() => useSocket());
    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function)));
    const second = renderHook(() => useSocket());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).not.toHaveBeenCalled();
    first.unmount();
    expect(socket.disconnect).not.toHaveBeenCalled();
    second.unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});

function fakeSocket() {
  return {
    connected: false,
    disconnected: false,
    auth: {},
    io: { on: vi.fn(), off: vi.fn() },
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    emit: vi.fn(),
  };
}
