/**
 * brain-v4 hostile review (second seat) #2: after the FIRST chat adopts its
 * created thread, the staff snapshot stays bound to that thread. New chat clears
 * the active conversation, so the next send asks for (target, thread=null), the
 * snapshot says thread=501, capturePublication refuses, and every later send is
 * "message not sent" until a reload. Real staff binding + real useAIChat.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useAIChat } from './useAIChat';
import { useCoachSessionSelectionState } from '../components/DashBoard/Pages/coach-assistant/hooks/useCoachSessionSelectionState';

const authState = vi.hoisted(() => ({
  current: { user: { id: '7', role: 'trainer' }, isAuthenticated: true, loading: false, error: null, token: 't', logout: vi.fn() },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState.current }));
vi.mock('../context/PaywallContext', () => ({ usePaywall: () => ({ showPaywall: vi.fn() }) }));
vi.mock('../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;
const getMock = apiService.get as unknown as ReturnType<typeof vi.fn>;

function useStaffChat() {
  const selection = useCoachSessionSelectionState({ actorNumber: 7, rawRole: 'trainer', staffActor: true, actorKey: '7:trainer' });
  const chat = (useAIChat as unknown as (role: string, binding: unknown) => ReturnType<typeof useAIChat>)('trainer', selection.publicationBinding);
  return { selection, chat };
}

describe('staff can start a SECOND chat after the first one adopted its thread', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    let nextId = 501;
    postMock.mockImplementation(async (url: string) => {
      if (url === '/api/ai-chat/conversations') {
        const id = nextId++;
        return { status: 200, data: { success: true, conversation: { id, title: null, context: 'coach_assistant', role: 'trainer', status: 'active', messages: [], messageCount: 0, lastMessageAt: null, createdAt: '2026-09-22T00:00:00.000Z', targetUserId: null } } };
      }
      const id = Number(/conversations\/(\d+)\/messages/.exec(url)?.[1]);
      return { status: 200, data: { success: true, conversationId: id, messageCount: 2,
        userMessage: { role: 'user', content: 'hi', timestamp: '2026-09-22T00:00:01.000Z' },
        assistantMessage: { role: 'assistant', content: `reply in ${id}`, timestamp: '2026-09-22T00:00:02.000Z' } } };
    });
    getMock.mockResolvedValue({ status: 200, data: { success: true, conversations: [] } });
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
  });

  it('first chat, New chat, second chat: both reply; the second creates its own thread', async () => {
    const { result, rerender } = renderHook(() => useStaffChat());
    // The real admission path publishes and then apply()s state, which re-renders.
    act(() => {
      result.current.selection.publish({ actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 1, targetUserId: null, threadId: null } as never);
    });
    rerender();
    let first: unknown;
    await act(async () => { first = await result.current.chat.sendMessageWithConversation('hi', 'coach_assistant', 'A', null, 'both'); });
    expect(first).toMatchObject({ content: 'reply in 501' });
    expect(result.current.selection.publicationBinding.getSnapshot()).toMatchObject({ threadId: 501 });

    act(() => { result.current.chat.newChat(); });
    expect(result.current.selection.publicationBinding.getSnapshot(), 'New chat returns to the admitted, thread-less scope').toMatchObject({ threadId: null, generation: 1 });

    let second: unknown;
    await act(async () => { second = await result.current.chat.sendMessageWithConversation('hi again', 'coach_assistant', 'B', null, 'both'); });
    expect(second, 'the second chat must not be silently refused').toMatchObject({ content: 'reply in 502' });
    const creates = postMock.mock.calls.filter(([url]) => url === '/api/ai-chat/conversations');
    expect(creates).toHaveLength(2);
  });

  it('CONTROL: a fresh admission (client switch) is not undone by a release', async () => {
    const { result, rerender } = renderHook(() => useStaffChat());
    act(() => { result.current.selection.publish({ actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 1, targetUserId: null, threadId: null } as never); });
    rerender();
    await act(async () => { await result.current.chat.sendMessageWithConversation('hi', 'coach_assistant', 'A', null, 'both'); });
    act(() => { result.current.selection.publish({ actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 2, targetUserId: 88, threadId: null } as never); });
    rerender();
    act(() => { result.current.chat.newChat(); });
    expect(result.current.selection.publicationBinding.getSnapshot()).toMatchObject({ generation: 2, targetUserId: 88, threadId: null });
  });

  it('reports whether a refused send reached the network (review #4: "nothing was saved" must be true)', async () => {
    const { result, rerender } = renderHook(() => useStaffChat());
    let refused: unknown;
    await act(async () => { refused = await result.current.chat.sendMessageWithConversation('hi', 'coach_assistant', 'A', null, 'both'); });
    expect(refused).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
    expect(result.current.chat.lastSendReachedNetwork()).toBe(false);
    act(() => { result.current.selection.publish({ actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 1, targetUserId: null, threadId: null } as never); });
    rerender();
    await act(async () => { await result.current.chat.sendMessageWithConversation('hi', 'coach_assistant', 'A', null, 'both'); });
    expect(result.current.chat.lastSendReachedNetwork()).toBe(true);
  });

  it('a refusal after the thread is created but BEFORE the message POST still reports "not sent"', async () => {
    const snap = Object.freeze({ actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', generation: 1, targetUserId: null, threadId: null, enabled: true });
    const binding = { getSnapshot: () => snap, adoptCreatedThread: async () => null };
    const { result } = renderHook(() => (useAIChat as unknown as (role: string, b: unknown) => ReturnType<typeof useAIChat>)('trainer', binding));
    let sent: unknown;
    await act(async () => { sent = await result.current.sendMessageWithConversation('hi', 'coach_assistant', 'A', null, 'both'); });
    expect(sent).toBeNull();
    expect(postMock.mock.calls.map(([url]) => url)).toEqual(['/api/ai-chat/conversations']);
    expect(result.current.lastSendReachedNetwork(), 'the words never reached the coach').toBe(false);
  });
});

