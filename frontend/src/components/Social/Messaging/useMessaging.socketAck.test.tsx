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
    connected: true,
    connectionState: 'connected',
    emit: socketMocks.emit,
    on: socketMocks.on,
  }),
}));

describe('useMessaging socket ack delivery', () => {
  beforeEach(() => {
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
    apiServiceMocks.get.mockResolvedValue({ data: [] });
  });

  it('sends socket messages with clientMessageId and clears pending state by ack id', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setActiveConversationId(7);
    });

    await act(async () => {
      await result.current.sendMessage('Duplicate-safe message');
    });

    expect(result.current.pendingMessages).toHaveLength(1);
    const pending = result.current.pendingMessages[0];
    expect(pending).toEqual(expect.objectContaining({
      content: 'Duplicate-safe message',
      conversationId: 7,
      status: 'pending',
    }));

    const sendCall = socketMocks.emit.mock.calls.find(([event]) => event === 'send_message');
    expect(sendCall).toBeTruthy();
    expect(sendCall?.[1]).toEqual(expect.objectContaining({
      conversationId: 7,
      content: 'Duplicate-safe message',
      clientMessageId: pending.clientMessageId,
    }));
    expect(typeof sendCall?.[2]).toBe('function');

    await act(async () => {
      await sendCall?.[2]?.({ ok: true, clientMessageId: pending.clientMessageId, messageId: 99, createdAt: '2026-06-30T17:00:00.000Z' });
    });

    expect(result.current.pendingMessages).toEqual([]);
  });

  it('marks the matching pending message failed when the socket ack rejects it', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setActiveConversationId(7);
    });

    await act(async () => {
      await result.current.sendMessage('Will fail once');
    });

    const pending = result.current.pendingMessages[0];
    const sendCall = socketMocks.emit.mock.calls.find(([event]) => event === 'send_message');

    await act(async () => {
      await sendCall?.[2]?.({ ok: false, clientMessageId: pending.clientMessageId, error: 'database stack detail' });
    });

    expect(result.current.pendingMessages).toEqual([
      expect.objectContaining({ clientMessageId: pending.clientMessageId, status: 'failed' }),
    ]);
    expect(result.current.error?.message).toBe(MESSAGING_ERROR_MESSAGES.send);
    expect(result.current.error?.message).not.toContain('database stack detail');
  });
  it('retries a failed pending message with the same clientMessageId', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setActiveConversationId(7);
    });

    await act(async () => {
      await result.current.sendMessage('Retry-safe message');
    });

    const pending = result.current.pendingMessages[0];
    const firstSendCall = socketMocks.emit.mock.calls.find(([event]) => event === 'send_message');

    await act(async () => {
      await firstSendCall?.[2]?.({ ok: false, clientMessageId: pending.clientMessageId, error: 'write failed' });
    });

    expect(result.current.pendingMessages[0]).toEqual(expect.objectContaining({
      clientMessageId: pending.clientMessageId,
      status: 'failed',
    }));

    socketMocks.emit.mockClear();

    await act(async () => {
      await result.current.retryMessage(pending.clientMessageId);
    });

    expect(result.current.pendingMessages[0]).toEqual(expect.objectContaining({
      clientMessageId: pending.clientMessageId,
      status: 'pending',
    }));

    const retryCall = socketMocks.emit.mock.calls.find(([event]) => event === 'send_message');
    expect(retryCall?.[1]).toEqual(expect.objectContaining({
      conversationId: 7,
      content: 'Retry-safe message',
      clientMessageId: pending.clientMessageId,
    }));

    await act(async () => {
      await retryCall?.[2]?.({
        ok: true,
        clientMessageId: pending.clientMessageId,
        message: {
          id: 501,
          conversation_id: 7,
          sender_id: 103,
          content: 'Retry-safe message',
          created_at: '2026-06-30T18:00:00.000Z',
          updated_at: '2026-06-30T18:00:00.000Z',
          clientMessageId: pending.clientMessageId,
        },
      });
    });

    expect(result.current.pendingMessages).toEqual([]);
    expect(result.current.messages).toEqual([
      expect.objectContaining({ id: 501, content: 'Retry-safe message' }),
    ]);
  });
});
