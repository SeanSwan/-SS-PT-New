import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useAIChat } from './useAIChat';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { id: '7', role: 'admin' }, isAuthenticated: true, loading: false,
  error: null, token: 'test-token', logout: vi.fn(),
}) }));
vi.mock('../context/PaywallContext', () => ({ usePaywall: () => ({ showPaywall: vi.fn() }) }));
vi.mock('../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const post = vi.mocked(apiService.post);
const created = { status: 200, data: { success: true, conversation: {
  id: 901, title: 'Synthetic', context: 'coach_assistant', role: 'admin', status: 'active',
  messages: [], messageCount: 0, lastMessageAt: null, createdAt: '2026-09-23T00:00:00Z', targetUserId: null,
} } };
beforeEach(() => { post.mockReset(); });

describe('R4 request-owned send receipts', () => {
  it('a rejected concurrent send cannot relabel an earlier message as not sent', async () => {
    let resolveMessage!: (value: unknown) => void;
    post.mockImplementation((url) => url === '/api/ai-chat/conversations'
      ? Promise.resolve(created)
      : new Promise((resolve) => { resolveMessage = resolve; }));
    const h = renderHook(() => useAIChat('admin'));
    const firstReceipt = { reachedNetwork: null as boolean | null };
    const refusedReceipt = { reachedNetwork: null as boolean | null };
    let first!: Promise<unknown>;
    act(() => { first = h.result.current.sendMessageWithConversation('first', 'coach_assistant', 'A', null, 'both', null, null, firstReceipt); });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    await act(async () => {
      expect(await h.result.current.sendMessageWithConversation('invalid target', 'coach_assistant', 'B', 'invalid', 'both', null, null, refusedReceipt)).toBeNull();
    });
    await act(async () => {
      resolveMessage({ status: 200, data: { success: true, conversationId: 901, messageCount: 2,
        userMessage: { role: 'user', content: 'first', timestamp: '2026-09-23T00:00:01Z' },
        assistantMessage: { role: 'assistant', content: 'reply', timestamp: '2026-09-23T00:00:02Z' },
      } });
      await first;
    });
    expect(firstReceipt.reachedNetwork).toBe(true);
    expect(refusedReceipt.reachedNetwork).toBe(false);
  });

  it('created-thread refusal records false and keeps the message off the wire', async () => {
    post.mockResolvedValue(created);
    const snap = Object.freeze({ actorId: 7, rawRole: 'admin', audienceRole: 'admin', generation: 1, targetUserId: null, threadId: null, enabled: true });
    const binding = { getSnapshot: () => snap, adoptCreatedThread: async () => null };
    const h = renderHook(() => useAIChat('admin', binding as never));
    const receipt = { reachedNetwork: null as boolean | null };
    await act(async () => {
      expect(await h.result.current.sendMessageWithConversation('draft', 'coach_assistant', 'A', null, 'both', null, null, receipt)).toBeNull();
    });
    expect(receipt.reachedNetwork).toBe(false);
    expect(post.mock.calls.map(([url]) => url)).toEqual(['/api/ai-chat/conversations']);
  });
});
