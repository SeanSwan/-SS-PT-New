import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useAIChat } from './useAIChat';
import { useStableThreadList } from '../components/DashBoard/Pages/coach-workspace/useStableThreadList';
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { id: '7', role: 'admin' }, isAuthenticated: true, loading: false, error: null, token: 't', logout: vi.fn(),
}) }));
vi.mock('../context/PaywallContext', () => ({ usePaywall: () => ({ showPaywall: vi.fn() }) }));
vi.mock('../services/api.service', () => ({ default: { get: vi.fn() } }));
const get = vi.mocked(apiService.get);
beforeEach(() => { get.mockReset(); });
function useList() {
  const chat = useAIChat('admin');
  return { chat, list: useStableThreadList(chat.conversations, '7:admin', false, chat.conversationsRefreshing, chat.conversationListFailed) };
}
describe('R1 real chat-list refresh state', () => {
  it('preserves rows in the ready-before-fetch gap, then clears an authoritative empty result', async () => {
    get.mockResolvedValue({ status: 200, data: { success: true, conversations: [{ id: 1, title: 'Synthetic' }] } });
    const h = renderHook(useList);
    await act(async () => { await h.result.current.chat.listConversations(); });
    expect(h.result.current.list.threads).toHaveLength(1);
    act(() => h.result.current.chat.newChat());
    expect(h.result.current.list).toMatchObject({ refreshing: true, threads: [{ id: 1 }] });
    get.mockResolvedValue({ status: 200, data: { success: true, conversations: [] } });
    await act(async () => { await h.result.current.chat.listConversations(); });
    expect(h.result.current.list).toEqual({ refreshing: false, threads: [] });
    act(() => h.result.current.chat.newChat());
    expect(h.result.current.list.threads).toEqual([]);
  });
  it('a failed list is terminal, not an endless refreshing placeholder', async () => {
    get.mockRejectedValue(new Error('synthetic unavailable'));
    const h = renderHook(useList);
    await act(async () => { await h.result.current.chat.listConversations(); });
    expect(h.result.current.chat.conversationsRefreshing).toBe(false);
    expect(h.result.current.chat.conversationListFailed).toBe(true);
    expect(h.result.current.chat.error).toContain('synthetic unavailable');
  });

  it('retains labelled cached rows on failure, then clears them only after a successful empty retry', async () => {
    get.mockResolvedValue({ status: 200, data: { success: true, conversations: [{ id: 1 }] } });
    const h = renderHook(useList);
    await act(async () => { await h.result.current.chat.listConversations(); });
    act(() => h.result.current.chat.newChat());
    get.mockRejectedValue(new Error('offline'));
    await act(async () => { await h.result.current.chat.listConversations(); });
    expect(h.result.current.chat.conversationListFailed).toBe(true);
    expect(h.result.current.list).toEqual({ refreshing: false, threads: [{ id: 1 }] });
    get.mockResolvedValue({ status: 200, data: { success: true, conversations: [] } });
    await act(async () => { await h.result.current.chat.listConversations('active', true); });
    expect(h.result.current.chat.conversationListFailed).toBe(false);
    expect(h.result.current.list.threads).toEqual([]);
  });

  it('a thread pick retires an in-flight list without leaving a permanent refresh', async () => {
    let resolveList!: (value: unknown) => void;
    const h = renderHook(useList);
    get.mockImplementation((url) => String(url).includes('?status=')
      ? new Promise(resolve => { resolveList = resolve; })
      : Promise.resolve({ status: 200, data: { success: true, conversation: {
        id: 1, context: 'coach_assistant', role: 'admin', status: 'active', targetUserId: null, messages: [],
      } } }));
    let pending!: Promise<unknown>;
    act(() => { pending = h.result.current.chat.listConversations('active', true); });
    expect(h.result.current.chat.conversationsRefreshing).toBe(true);
    await act(async () => { await h.result.current.chat.loadConversation(1); });
    expect(h.result.current.chat.conversationsRefreshing).toBe(false);
    expect(h.result.current.chat.conversationListFailed).toBe(true);
    await act(async () => { resolveList({ status: 200, data: { success: true, conversations: [{ id: 999 }] } }); await pending; });
    expect(h.result.current.chat.conversations).toEqual([]);
    expect(h.result.current.chat.conversationListFailed).toBe(true);
  });
});
