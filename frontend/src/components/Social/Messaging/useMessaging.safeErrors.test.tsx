import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGING_ERROR_MESSAGES } from './messagingSafeErrors';
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

const rawServerError = {
  message: 'SequelizeConnectionError: password authentication failed for user swanadmin',
};

describe('useMessaging safe error boundaries', () => {
  beforeEach(() => {
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
    localStorage.clear();
  });

  it('does not expose backend error bodies when conversations fail to load', async () => {
    apiServiceMocks.get.mockRejectedValue(rawServerError);

    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error?.message).toBe(MESSAGING_ERROR_MESSAGES.conversations);
    });

    expect(result.current.error?.message).not.toContain('SequelizeConnectionError');
    expect(result.current.error?.message).not.toContain('swanadmin');
  });

  it('does not expose backend error bodies when REST message send fails', async () => {
    apiServiceMocks.get.mockResolvedValue({ data: [] });
    apiServiceMocks.post.mockRejectedValue(rawServerError);

    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setActiveConversationId(7);
    });

    await act(async () => {
      await result.current.sendMessage('Need the workout notes');
    });

    expect(result.current.error?.message).toBe(MESSAGING_ERROR_MESSAGES.send);
    expect(result.current.error?.message).not.toContain('SequelizeConnectionError');
    expect(result.current.error?.message).not.toContain('swanadmin');
  });

  it('encodes conversation ids before constructing message history paths', async () => {
    apiServiceMocks.get.mockResolvedValue({ data: [] });

    const rawConversationId = 'thread/../../admin?token=swanadmin';
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.selectConversation(rawConversationId);
    });

    await waitFor(() => {
      expect(apiServiceMocks.get.mock.calls.some(([url]) => String(url).includes('/messages?limit=500'))).toBe(true);
    });

    const messageHistoryPath = apiServiceMocks.get.mock.calls
      .map(([url]) => String(url))
      .find((url) => url.includes('/messages?limit=500'));

    expect(messageHistoryPath).toContain(
      `/conversations/${encodeURIComponent(rawConversationId)}/messages`
    );
    expect(messageHistoryPath).not.toContain(`/conversations/${rawConversationId}/messages`);
  });
});
