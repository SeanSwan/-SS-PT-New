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
const getMock = apiService.get as unknown as ReturnType<typeof vi.fn>;

function conversationResponse(id: number, title: string) {
  return {
    status: 200,
    data: {
      success: true,
      conversation: {
        id,
        title,
        context: 'coach_assistant',
        role: 'admin',
        status: 'active',
        messages: [{ role: 'assistant', content: `${title} loaded`, timestamp: '2026-05-26T00:00:00.000Z' }],
        messageCount: 1,
        lastMessageAt: '2026-05-26T00:00:00.000Z',
        createdAt: '2026-05-26T00:00:00.000Z',
      },
    },
  };
}

describe('useAIChat conversation target isolation', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
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

  it('posts selected equipment profile as structured message context', async () => {
    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessageWithConversation(
        'Generate today with the selected gym setup',
        'workout_generation',
        'Client #424242 daily training',
        424242,
        'both',
        null,
        { equipmentProfileId: 77 }
      );
    });

    expect(postMock).toHaveBeenCalledWith(
      '/api/ai-chat/conversations/701/messages',
      {
        message: 'Generate today with the selected gym setup',
        requestContext: { equipmentProfileId: 77 },
      },
      expect.any(Object)
    );
  });

  it('posts selected scheduled session as structured message context', async () => {
    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessageWithConversation(
        'Log the booked workout',
        'coach_assistant',
        'Client #424242 daily training',
        424242,
        'both',
        null,
        {
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
        }
      );
    });

    expect(postMock).toHaveBeenCalledWith(
      '/api/ai-chat/conversations/701/messages',
      {
        message: 'Log the booked workout',
        requestContext: {
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
        },
      },
      expect.any(Object)
    );
  });
  it('keeps the newest requested conversation active when history loads resolve out of order', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const firstLoad = new Promise((resolve) => { resolveFirst = resolve; });
    const secondLoad = new Promise((resolve) => { resolveSecond = resolve; });

    getMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations/101') return firstLoad;
      if (url === '/api/ai-chat/conversations/102') return secondLoad;
      return Promise.reject(new Error(`unexpected URL ${url}`));
    });

    const { result } = renderHook(() => useAIChat());

    act(() => {
      void result.current.loadConversation(101);
      void result.current.loadConversation(102);
    });

    await act(async () => {
      resolveSecond(conversationResponse(102, 'Client confirmation holds'));
      await secondLoad;
    });
    expect(result.current.activeConversation?.id).toBe(102);
    expect(result.current.messages[0]?.content).toBe('Client confirmation holds loaded');

    await act(async () => {
      resolveFirst(conversationResponse(101, 'Friday intake cleanup'));
      await firstLoad;
    });
    expect(result.current.activeConversation?.id).toBe(102);
    expect(result.current.messages[0]?.content).toBe('Client confirmation holds loaded');
  });
});
