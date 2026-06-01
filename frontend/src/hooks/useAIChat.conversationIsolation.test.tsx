import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useAIChat } from './useAIChat';

vi.mock('../services/api.service', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;

describe('useAIChat conversation target isolation', () => {
  beforeEach(() => {
    postMock.mockReset();
    let nextConversationId = 700;

    postMock.mockImplementation((url: string, payload: Record<string, unknown>) => {
      if (url === '/api/ai-chat/conversations') {
        nextConversationId += 1;
        return Promise.resolve({
          status: 200,
          data: {
            success: true,
            conversation: {
              id: nextConversationId,
              title: payload.title ?? null,
              context: payload.context,
              role: 'admin',
              status: 'active',
              messages: [],
              messageCount: 0,
              lastMessageAt: null,
              createdAt: '2026-05-26T00:00:00.000Z',
              targetUserId: payload.targetUserId ?? null,
            },
          },
        });
      }

      return Promise.resolve({
        status: 200,
        data: {
          success: true,
          userMessage: {
            role: 'user',
            content: payload.message,
            timestamp: '2026-05-26T00:00:01.000Z',
          },
          assistantMessage: {
            role: 'assistant',
            content: 'Ready for review.',
            timestamp: '2026-05-26T00:00:02.000Z',
          },
          messageCount: 2,
        },
      });
    });
  });

  it('creates a new conversation when the requested target client changes', async () => {
    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessageWithConversation(
        'Log today for client A',
        'workout_generation',
        'Client #424242 daily training',
        424242,
        'both'
      );
    });

    await act(async () => {
      await result.current.sendMessageWithConversation(
        'Log today for client B',
        'workout_generation',
        'Client #515151 daily training',
        515151,
        'both'
      );
    });

    const createCalls = postMock.mock.calls.filter(([url]) => url === '/api/ai-chat/conversations');
    expect(createCalls).toHaveLength(2);
    expect(createCalls[0][1]).toMatchObject({ targetUserId: 424242 });
    expect(createCalls[1][1]).toMatchObject({ targetUserId: 515151 });
    expect(postMock).toHaveBeenCalledWith(
      '/api/ai-chat/conversations/702/messages',
      expect.objectContaining({ message: 'Log today for client B' }),
      expect.any(Object)
    );
  });
});
