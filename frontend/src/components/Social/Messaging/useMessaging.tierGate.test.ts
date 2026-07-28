import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessaging } from './useMessaging';

const apiServiceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

const socketMocks = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()),
}));

vi.mock('../../../services/api.service', () => ({
  default: apiServiceMocks,
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
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
  });

  it('does not fetch conversations when messaging is disabled by tier', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(apiServiceMocks.get).not.toHaveBeenCalled();
    expect(socketMocks.emit).not.toHaveBeenCalled();
  });

  it('passes the page-level tier decision into the live messaging hook', () => {
    const messagingViewSource = source('./MessagingView.tsx');

    expect(messagingViewSource).toContain('const messagingEnabled = isStaffRole || isElite;');
    expect(messagingViewSource).toContain('useMessaging(currentUserId, { enabled: messagingEnabled && !subscriptionLoading })');
  });

  it('passes message action handlers into the mounted thread', () => {
    const messagingViewSource = source('./MessagingView.tsx');

    expect(messagingViewSource).toContain('onEditMessage={editMessage}');
    expect(messagingViewSource).toContain('onDeleteMessage={deleteMessage}');
    expect(messagingViewSource).toContain('onToggleReaction={toggleMessageReaction}');
    expect(messagingViewSource).toContain('onTogglePin={toggleMessagePin}');
  });

  it('returns raw live search arrays from the mounted hook as visible users', async () => {
    apiServiceMocks.get.mockImplementation((url: string) => Promise.resolve({
      data: url.includes('/users/search')
        ? [{ id: 88, name: 'Sean Swan', username: 'sean', role: 'admin', photo: null }]
        : [],
    }));

    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.searchUsers('Sean Swan')).resolves.toEqual([
      expect.objectContaining({ id: 88, firstName: 'Sean', lastName: 'Swan', role: 'admin' }),
    ]);
  });
});
