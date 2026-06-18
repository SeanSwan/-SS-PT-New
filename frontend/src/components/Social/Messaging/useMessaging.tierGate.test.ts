import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessaging } from './useMessaging';

const socketMocks = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()),
}));

vi.mock('../../../hooks/useSocket', () => ({
  useSocket: () => ({
    connected: false,
    connectionState: 'disconnected',
    emit: socketMocks.emit,
    on: socketMocks.on,
  }),
}));

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('useMessaging tier gate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
  });

  it('does not fetch conversations when messaging is disabled by tier', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(socketMocks.emit).not.toHaveBeenCalled();
  });

  it('passes the page-level tier decision into the live messaging hook', () => {
    const messagingViewSource = source('./MessagingView.tsx');

    expect(messagingViewSource).toContain('const messagingEnabled = isStaffRole || isElite;');
    expect(messagingViewSource).toContain('useMessaging(currentUserId, { enabled: messagingEnabled && !subscriptionLoading })');
  });
});
