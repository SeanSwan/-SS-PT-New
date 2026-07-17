/**
 * Regression: the send-failure catch path must remove the optimistic user
 * bubble WITHOUT throwing (R3 hostile review caught catch-scope refs that
 * would ReferenceError inside the state updater), and must never mutate a
 * different conversation than the one the send belongs to.
 */
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

function creationResponse(id: number) {
  return {
    status: 200,
    data: {
      success: true,
      conversation: {
        id,
        title: 'Failure lane',
        context: 'coach_assistant',
        role: 'admin',
        status: 'active',
        messages: [],
        messageCount: 0,
        lastMessageAt: null,
        createdAt: '2026-07-16T00:00:00.000Z',
        targetUserId: null,
      },
    },
  };
}

describe('useAIChat send-failure cleanup', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('removes the optimistic bubble on a failed sendMessageWithConversation without throwing', async () => {
    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return Promise.resolve(creationResponse(901));
      return Promise.reject(Object.assign(new Error('server exploded'), { response: { status: 500, data: {} } }));
    });

    const { result } = renderHook(() => useAIChat('admin'));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.sendMessageWithConversation('hello coach', 'coach_assistant');
    });

    expect(outcome).toMatchObject({ failed: true, originalMessage: 'hello coach' });
    // The optimistic user message must be gone — no stranded "sent" bubble.
    expect(result.current.activeConversation?.messages ?? []).toHaveLength(0);
  });

  it('keeps the successful exchange intact (identity merge appends user + assistant once)', async () => {
    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return Promise.resolve(creationResponse(902));
      return Promise.resolve({
        status: 200,
        data: {
          success: true,
          userMessage: { role: 'user', content: 'hello coach', timestamp: '2026-07-16T00:01:00.000Z' },
          assistantMessage: { role: 'assistant', content: 'Ready.', timestamp: '2026-07-16T00:01:01.000Z' },
          messageCount: 2,
        },
      });
    });

    const { result } = renderHook(() => useAIChat('admin'));
    await act(async () => {
      await result.current.sendMessageWithConversation('hello coach', 'coach_assistant');
    });

    const messages = result.current.activeConversation?.messages ?? [];
    expect(messages.map((entry) => entry.role)).toEqual(['user', 'assistant']);
    expect(messages[1].content).toBe('Ready.');
  });
});
