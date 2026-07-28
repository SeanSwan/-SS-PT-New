import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessaging } from './useMessaging';
import type { MessageData } from './MessagingTypes';

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

const baseMessage: MessageData = {
  id: 501,
  conversation_id: 7,
  sender_id: 103,
  content: 'Original',
  created_at: '2026-06-30T18:00:00.000Z',
  updated_at: '2026-06-30T18:00:00.000Z',
};

describe('useMessaging message actions', () => {
  beforeEach(() => {
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
    apiServiceMocks.get.mockResolvedValue({ data: [] });
    apiServiceMocks.post.mockResolvedValue({ data: { ...baseMessage, id: 700, content: 'Reply text', reply_to_message_id: 501 } });
    apiServiceMocks.patch.mockResolvedValue({ data: { message: { ...baseMessage, content: 'Updated note', edited_at: '2026-06-30T18:05:00.000Z' } } });
    apiServiceMocks.put.mockResolvedValue({ data: { reaction: { id: 9, messageId: 501, userId: 103, reaction: 'swan', createdAt: '2026-06-30T18:07:00.000Z' } } });
    apiServiceMocks.delete.mockResolvedValue({ data: { success: true } });
  });

  it('sends reply references through REST instead of socket payloads', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setActiveConversationId(7));
    await act(async () => {
      await result.current.sendMessage('Reply text', { replyToMessageId: 501 });
    });

    expect(apiServiceMocks.post).toHaveBeenCalledWith(
      '/api/messaging/conversations/7/messages',
      { content: 'Reply text', replyToMessageId: 501 },
      expect.any(Object)
    );
    expect(socketMocks.emit.mock.calls.some(([event]) => event === 'send_message')).toBe(false);
  });

  it('sends governed attachments through REST instead of socket payloads', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setActiveConversationId(7));
    await act(async () => {
      await result.current.sendMessage('', {
        attachments: [{ kind: 'link', title: 'Workout plan', url: '/dashboard/client/workouts' }],
      });
    });

    expect(apiServiceMocks.post).toHaveBeenCalledWith(
      '/api/messaging/conversations/7/messages',
      { content: '', attachments: [{ kind: 'link', title: 'Workout plan', url: '/dashboard/client/workouts' }] },
      expect.any(Object)
    );
    expect(socketMocks.emit.mock.calls.some(([event]) => event === 'send_message')).toBe(false);
  });
  it('calls edit, delete, reaction, and pin endpoints with safe local updates', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editMessage(501, 'Updated note');
      await result.current.deleteMessage(501);
      await result.current.toggleMessageReaction(baseMessage, 'swan');
      await result.current.toggleMessageReaction({ ...baseMessage, reactions: [{ id: 1, userId: 103, reaction: 'swan', createdAt: 'now' }] }, 'swan');
      await result.current.toggleMessagePin(baseMessage);
      await result.current.toggleMessagePin({ ...baseMessage, pins: [{ id: 2, pinnedBy: 103, createdAt: 'now' }] });
      await result.current.toggleMessageSave(baseMessage);
      await result.current.toggleMessageSave({ ...baseMessage, saves: [{ id: 3, savedBy: 103, createdAt: 'now' }] });
    });

    expect(apiServiceMocks.patch).toHaveBeenCalledWith('/api/messaging/messages/501', { content: 'Updated note' }, expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501', expect.any(Object));
    expect(apiServiceMocks.put).toHaveBeenCalledWith('/api/messaging/messages/501/reactions', { reaction: 'swan' }, expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/reactions?reaction=swan', expect.any(Object));
    expect(apiServiceMocks.put).toHaveBeenCalledWith('/api/messaging/messages/501/pin', undefined, expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/pin', expect.any(Object));
    expect(apiServiceMocks.put).toHaveBeenCalledWith('/api/messaging/messages/501/save', undefined, expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/save', expect.any(Object));
  });

  it('matches string viewer ids against numeric message action metadata', async () => {
    const { result } = renderHook(() => useMessaging('103' as unknown as number, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleMessageReaction({ ...baseMessage, reactions: [{ id: 1, userId: 103, reaction: 'swan', createdAt: 'now' }] }, 'swan');
      await result.current.toggleMessagePin({ ...baseMessage, pins: [{ id: 2, pinnedBy: 103, createdAt: 'now' }] });
      await result.current.toggleMessageSave({ ...baseMessage, saves: [{ id: 3, savedBy: 103, createdAt: 'now' }] });
    });

    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/reactions?reaction=swan', expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/pin', expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith('/api/messaging/messages/501/save', expect.any(Object));
    expect(apiServiceMocks.put).not.toHaveBeenCalledWith('/api/messaging/messages/501/pin', undefined, expect.any(Object));
    expect(apiServiceMocks.put).not.toHaveBeenCalledWith('/api/messaging/messages/501/save', undefined, expect.any(Object));
  });

  it('archives, marks unread, and searches messages through encoded conversation endpoints', async () => {
    const rawConversationId = 'thread/unsafe?x=1';
    apiServiceMocks.get.mockImplementation((url: string) => Promise.resolve({
      data: url.includes('/messages/search')
        ? { results: [{ ...baseMessage, id: 502, content: 'Needle found', sender_id: 204 }] }
        : [],
    }));

    const { result } = renderHook(() => useMessaging(103, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let searchResults: MessageData[] = [];
    await act(async () => {
      searchResults = await result.current.searchConversationMessages(rawConversationId, 'needle');
      await result.current.archiveConversation(rawConversationId);
      await result.current.markConversationUnread(rawConversationId);
    });

    const encoded = encodeURIComponent(rawConversationId);
    expect(searchResults).toEqual([expect.objectContaining({ id: 502, content: 'Needle found' })]);
    expect(apiServiceMocks.get).toHaveBeenCalledWith(
      `/api/messaging/conversations/${encoded}/messages/search?q=needle&limit=25`,
      expect.any(Object)
    );
    expect(apiServiceMocks.patch).toHaveBeenCalledWith(`/api/messaging/conversations/${encoded}/archive`, undefined, expect.any(Object));
    expect(apiServiceMocks.patch).toHaveBeenCalledWith(`/api/messaging/conversations/${encoded}/mark-unread`, undefined, expect.any(Object));
  });

  it('reports messages, blocks users, and toggles conversation mute through governed endpoints', async () => {
    const rawConversationId = 'thread/unsafe?x=1';
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reportMessage(501, 'safety', 'Urgent pain concern');
      await result.current.blockUser(204);
      await result.current.muteConversation(rawConversationId);
      await result.current.unmuteConversation(rawConversationId);
    });

    const encoded = encodeURIComponent(rawConversationId);
    expect(apiServiceMocks.post).toHaveBeenCalledWith('/api/messaging/messages/501/report', { reason: 'safety', details: 'Urgent pain concern' }, expect.any(Object));
    expect(apiServiceMocks.post).toHaveBeenCalledWith('/api/messaging/users/204/block', undefined, expect.any(Object));
    expect(apiServiceMocks.put).toHaveBeenCalledWith(`/api/messaging/conversations/${encoded}/mute`, undefined, expect.any(Object));
    expect(apiServiceMocks.delete).toHaveBeenCalledWith(`/api/messaging/conversations/${encoded}/mute`, expect.any(Object));
  });
});