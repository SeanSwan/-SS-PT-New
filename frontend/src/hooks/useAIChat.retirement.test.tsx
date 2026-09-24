import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useAIChat, type AIConversationRole } from './useAIChat';
import {
  isAllowedRawRole,
  isPublicationSnapshot,
  parseStrictNullableId,
} from './coachPublicationScope';

const authState = vi.hoisted(() => ({
  current: {
    user: { id: '7', role: 'trainer' },
    isAuthenticated: true,
    loading: false,
    error: null,
    token: 'test-token',
    logout: vi.fn(),
  },
}));

const paywallState = vi.hoisted(() => ({ showPaywall: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

vi.mock('../context/PaywallContext', () => ({
  usePaywall: () => paywallState,
}));

vi.mock('../services/api.service', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

type PublicationSnapshot = Readonly<{
  actorId: number;
  rawRole: string;
  audienceRole: string;
  generation: number;
  targetUserId: number | null;
  threadId: number | null;
  enabled: boolean;
}>;

type PublicationBinding = {
  getSnapshot: () => PublicationSnapshot | null;
  adoptCreatedThread?: (args: {
    captured: PublicationSnapshot;
    operation: object;
    thread: { id: number; role: string; targetUserId: number | null };
    signal: AbortSignal;
  }) => Promise<PublicationSnapshot | null>;
};

type B1UseAIChat = (
  audienceRole?: AIConversationRole,
  binding?: PublicationBinding,
) => ReturnType<typeof useAIChat>;

const useAIChatB1 = useAIChat as unknown as B1UseAIChat;
const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;
const getMock = apiService.get as unknown as ReturnType<typeof vi.fn>;
const StrictWrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

function conversationResponse(
  id: number,
  targetUserId: number | null,
  role = 'trainer',
  extra: Record<string, unknown> = {},
) {
  return {
    status: 200,
    data: {
      success: true,
      conversation: {
        id,
        title: null,
        context: 'coach_assistant',
        role,
        status: 'active',
        messages: [],
        messageCount: 0,
        lastMessageAt: null,
        createdAt: '2026-09-12T00:00:00.000Z',
        targetUserId,
        ...extra,
      },
    },
  };
}

function messageResponse(content = 'Ready.', frontendActions: unknown[] = [], conversationId = 901) {
  return {
    status: 200,
    data: {
      success: true,
      userMessage: {
        role: 'user',
        content: 'hello coach',
        timestamp: '2026-09-12T00:00:01.000Z',
      },
      assistantMessage: {
        role: 'assistant',
        content,
        timestamp: '2026-09-12T00:00:02.000Z',
      },
      messageCount: 2,
      conversationId,
      frontendActions,
    },
  };
}

function snapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: 7,
    rawRole: 'trainer',
    audienceRole: 'trainer',
    generation: 1,
    targetUserId: 4242,
    threadId: null,
    enabled: true,
    ...overrides,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function bind(
  read: () => PublicationSnapshot | null,
  adoptCreatedThread?: PublicationBinding['adoptCreatedThread'],
): PublicationBinding {
  return { getSnapshot: read, ...(adoptCreatedThread ? { adoptCreatedThread } : {}) };
}

describe('useAIChat B1 publication retirement', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    vi.mocked(apiService.patch).mockReset();
    vi.mocked(apiService.delete).mockReset();
    authState.current.user = { id: '7', role: 'trainer' };
    authState.current.isAuthenticated = true;
    paywallState.showPaywall.mockReset();
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('retires a delayed create before install or follow-on POST when the admitted token changes', async () => {
    const create = deferred<ReturnType<typeof conversationResponse>>();
    let live = snapshot();
    const adopter = vi.fn<NonNullable<PublicationBinding['adoptCreatedThread']>>()
      .mockResolvedValue(null);

    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return create.promise;
      return Promise.resolve(messageResponse('should never publish', [
        { event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'stale' } },
      ]));
    });

    const { result, rerender } = renderHook(() => useAIChatB1(
      'trainer',
      bind(() => live, adopter),
    ));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.sendMessageWithConversation(
        'hello coach',
        'coach_assistant',
        'Client 4242',
        4242,
      );
    });

    live = snapshot({ generation: 2, enabled: false });
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();

    await act(async () => {
      create.resolve(conversationResponse(901, 4242));
      await pending;
    });

    expect(adopter).not.toHaveBeenCalled();
    expect(postMock.mock.calls[0][2]).toEqual(expect.objectContaining({
      _isBackgroundRequest: true,
      signal: expect.any(AbortSignal),
    }));
    expect(postMock.mock.calls.filter(([url]) => url === '/api/ai-chat/conversations')).toHaveLength(1);
    expect(postMock.mock.calls.some(([url]) => String(url).includes('/messages'))).toBe(false);
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('does not return or install a delayed load after newChat retires it', async () => {
    const load = deferred<ReturnType<typeof conversationResponse>>();
    getMock.mockResolvedValue(load.promise);

    const { result } = renderHook(() => useAIChatB1('trainer'));

    let returned: unknown = 'unset';
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.loadConversation(101).then(value => {
        returned = value;
        return value;
      });
      result.current.newChat();
    });

    await act(async () => {
      load.resolve(conversationResponse(101, null));
      await pending;
    });

    expect(returned).toBeNull();
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps a newer send pending when an older same-scope send fails and finally runs', async () => {
    let next = 900;
    const first = deferred<ReturnType<typeof messageResponse>>();
    const second = deferred<ReturnType<typeof messageResponse>>();

    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') {
        next += 1;
        return Promise.resolve(conversationResponse(next, null));
      }
      if (String(url).endsWith('/messages')) {
        return postMock.mock.calls.filter(([entry]) => String(entry).endsWith('/messages')).length === 1
          ? first.promise
          : second.promise;
      }
      return Promise.resolve({ status: 200, data: { success: true } });
    });

    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => {
      await result.current.createConversation('coach_assistant');
    });

    let firstPending!: Promise<unknown>;
    let secondPending!: Promise<unknown>;
    act(() => {
      firstPending = result.current.sendMessage('first');
    });
    act(() => {
      secondPending = result.current.sendMessage('second');
    });

    await act(async () => {
      first.reject(Object.assign(new Error('first failed'), {
        response: { status: 500, data: {} },
      }));
      await firstPending;
    });

    expect(result.current.sending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.messages.some(message => message.content === 'first')).toBe(false);
    expect(result.current.messages.some(message => message.content === 'second')).toBe(true);

    await act(async () => {
      second.resolve(messageResponse('second response'));
      await secondPending;
    });

    expect(result.current.sending).toBe(false);
    expect(result.current.messages.map(message => message.content)).toContain('second response');
  });

  it('suppresses a late frontend action when the bound send is retired before response', async () => {
    const response = deferred<ReturnType<typeof messageResponse>>();
    let live = snapshot({ threadId: 901, targetUserId: null });
    getMock.mockResolvedValue(conversationResponse(901, null));
    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return Promise.resolve(conversationResponse(901, null));
      if (String(url).endsWith('/messages')) return response.promise;
      return Promise.resolve({ status: 200, data: { success: true } });
    });

    const { result, rerender } = renderHook(() => useAIChatB1(
      'trainer',
      bind(() => live),
    ));

    await act(async () => {
      await result.current.loadConversation(901);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.sendMessage('hello coach');
    });

    expect(result.current.activeConversation?.id).toBe(901);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][0]).toBe('/api/ai-chat/conversations/901/messages');
    live = snapshot({ generation: 2, enabled: false, threadId: 901, targetUserId: null });
    rerender();

    await act(async () => {
      response.resolve(messageResponse('stale response', [
        { event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'stale' } },
      ]));
      await pending;
    });

    expect(window.dispatchEvent).not.toHaveBeenCalled();
    expect(result.current.activeConversation?.messages ?? []).toEqual([]);
  });

  it('rejects a create response whose target does not exactly match the request', async () => {
    let live = snapshot();
    const adopter = vi.fn<NonNullable<PublicationBinding['adoptCreatedThread']>>()
      .mockResolvedValue(snapshot({ threadId: 902 }));
    postMock.mockImplementation((url: string) => String(url).endsWith('/messages') ? Promise.resolve(messageResponse('unexpected')) : Promise.resolve(conversationResponse(902, 5151)));

    const { result } = renderHook(() => useAIChatB1(
      'trainer',
      bind(() => live, adopter),
    ));

    let outcome!: unknown;
    await act(async () => {
      outcome = await result.current.sendMessageWithConversation(
        'hello coach',
        'coach_assistant',
        'Client 4242',
        4242,
      );
    });

    expect(outcome).toBeNull();
    expect(adopter).not.toHaveBeenCalled();
    expect(postMock.mock.calls.some(([url]) => String(url).includes('/messages'))).toBe(false);
    expect(result.current.activeConversation).toBeNull();
  });

  it('waits for one exact created-thread acknowledgement before the follow-on POST', async () => {
    const ack = deferred<PublicationSnapshot | null>();
    let live = snapshot();
    const adopter = vi.fn<NonNullable<PublicationBinding['adoptCreatedThread']>>()
      .mockImplementation(async ({ thread }) => {
        live = snapshot({ enabled: false, threadId: null });
        return ack.promise.then(value => {
          live = value;
          return value;
        });
      });

    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return Promise.resolve(conversationResponse(903, 4242));
      if (String(url).endsWith('/messages')) return Promise.resolve(messageResponse('adopted response', [], 903));
      return Promise.resolve({ status: 200, data: { success: true } });
    });

    const { result } = renderHook(() => useAIChatB1(
      'trainer',
      bind(() => live, adopter),
    ));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.sendMessageWithConversation(
        'hello coach',
        'coach_assistant',
        'Client 4242',
        4242,
      );
    });

    await waitFor(() => expect(adopter).toHaveBeenCalledTimes(1));
    expect(postMock.mock.calls.some(([url]) => String(url).includes('/messages'))).toBe(false);
    expect(result.current.activeConversation).toBeNull();

    const [args] = adopter.mock.calls[0];
    expect(args.thread).toEqual({ id: 903, role: 'trainer', targetUserId: 4242 });
    expect(typeof args.operation).toBe('object');
    expect(args.operation).not.toBe(args.thread);

    await act(async () => {
      ack.resolve(snapshot({ threadId: 903 }));
      await pending;
    });

    expect(postMock.mock.calls.some(([url]) => String(url).includes('/messages'))).toBe(true);
    expect(result.current.activeConversation?.id).toBe(903);
  });

  it('expires a created-thread acknowledgement after five seconds without reviving the operation', async () => {
    vi.useFakeTimers();
    let live = snapshot();
    const adopter = vi.fn<NonNullable<PublicationBinding['adoptCreatedThread']>>()
      .mockImplementation(() => new Promise(() => {}));

    postMock.mockImplementation((url: string) => {
      if (url === '/api/ai-chat/conversations') return Promise.resolve(conversationResponse(904, 4242));
      if (String(url).endsWith('/messages')) return Promise.resolve(messageResponse('should not send'));
      return Promise.resolve({ status: 200, data: { success: true } });
    });

    const { result } = renderHook(() => useAIChatB1(
      'trainer',
      bind(() => live, adopter),
    ));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.sendMessageWithConversation(
        'hello coach',
        'coach_assistant',
        'Client 4242',
        4242,
      );
    });

    let settled = false;
    void pending.then(() => { settled = true; });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(adopter).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    expect(settled).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await pending; });
    expect(settled).toBe(true);

    expect(result.current.activeConversation).toBeNull();
    expect(postMock.mock.calls.some(([url]) => String(url).includes('/messages'))).toBe(false);
  });

  it('rejects an A-B-A late load even though actor A returns with a new generation', async () => {
    const load = deferred<ReturnType<typeof conversationResponse>>();
    getMock.mockImplementation(() => load.promise);
    let live = snapshot({ threadId: 101, targetUserId: null });
    const { result, rerender } = renderHook(() => useAIChatB1('trainer', bind(() => live)));

    let returned!: unknown;
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.loadConversation(101).then(value => {
        returned = value;
        return value;
      });
    });

    live = snapshot({ actorId: 8, generation: 2, threadId: 101, targetUserId: null });
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    live = snapshot({ actorId: 7, generation: 3, threadId: 101, targetUserId: null });
    authState.current.user = { id: '7', role: 'trainer' };
    rerender();

    await act(async () => {
      load.resolve(conversationResponse(101, null));
      await pending;
    });

    expect(returned).toBeNull();
    expect(result.current.activeConversation).toBeNull();
  });

  it('masks actor A state on the first render for actor B before effects', async () => {
    postMock.mockResolvedValue(conversationResponse(906, null));
    const observations: Array<number | null> = [];
    const { result, rerender } = renderHook(() => {
      const chat = useAIChatB1('trainer');
      observations.push(chat.activeConversation?.id ?? null);
      return chat;
    });
    await act(async () => { await result.current.createConversation('coach_assistant'); });
    expect(result.current.activeConversation?.id).toBe(906);
    observations.length = 0;
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every(value => value === null)).toBe(true);
    expect(result.current.activeConversation).toBeNull();
  });

  it('masks bound state immediately when the selected target changes', async () => {
    let live = snapshot({ threadId: 901 });
    getMock.mockResolvedValue(conversationResponse(901, 4242));
    const { result, rerender } = renderHook(() => useAIChatB1('trainer', bind(() => live)));

    await act(async () => { await result.current.loadConversation(901); });
    expect(result.current.activeConversation?.id).toBe(901);

    live = snapshot({ threadId: 901, targetUserId: 5151 });
    rerender();

    expect(result.current.activeConversation).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('does not return cached private rows through a callback captured before logout', async () => {
    getMock.mockResolvedValue({ status: 200, data: {
      success: true,
      conversations: [{ id: 907, title: 'private', context: 'coach_assistant', status: 'active' }],
    } });
    const { result, rerender } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.listConversations('active', true); });
    expect(result.current.conversations).toHaveLength(1);
    const staleList = result.current.listConversations;
    await expect(staleList('active', false)).resolves.toHaveLength(1);

    authState.current.user = null;
    authState.current.isAuthenticated = false;
    rerender();

    await expect(staleList('active', false)).resolves.toEqual([]);
    expect(result.current.conversations).toEqual([]);
  });

  it('rejects an old actor callback even after the next actor warms the history cache', async () => {
    getMock.mockResolvedValueOnce({ status: 200, data: { success: true, conversations: [{ id: 911, title: 'actor A private' }] } });
    const { result, rerender } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.listConversations('active', true); });
    const oldActorList = result.current.listConversations;
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    getMock.mockResolvedValueOnce({ status: 200, data: { success: true, conversations: [{ id: 912, title: 'actor B private' }] } });
    await act(async () => { await result.current.listConversations('active', true); });
    expect(result.current.conversations[0]?.id).toBe(912);
    await expect(oldActorList('active', false)).resolves.toEqual([]);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('restores the committed lifetime after StrictMode setup and cleanup replay', async () => {
    getMock.mockResolvedValue(conversationResponse(908, null));
    const { result } = renderHook(() => useAIChatB1('trainer'), { wrapper: StrictWrapper });

    let loaded: unknown;
    await act(async () => { loaded = await result.current.loadConversation(908); });

    expect((loaded as { id?: number } | null)?.id).toBe(908);
    expect(result.current.activeConversation?.id).toBe(908);
  });

  it('opens the paywall only for a still-current 402 response', async () => {
    const paywall = Object.assign(new Error('plan limit'), {
      response: { status: 402, data: { featureName: 'Swan Coach', reason: 'limit' } },
    });
    postMock.mockImplementation((url: string) => (
      url === '/api/ai-chat/conversations'
        ? Promise.resolve(conversationResponse(909, null))
        : Promise.reject(paywall)
    ));
    const { result } = renderHook(() => useAIChatB1('trainer'));

    await act(async () => { await result.current.sendMessageWithConversation('hello coach', 'coach_assistant'); });

    expect(paywallState.showPaywall).toHaveBeenCalledWith(
      'Swan Coach',
      expect.objectContaining({ featureName: 'Swan Coach' }),
    );
  });

  it('suppresses a late 402 after the operation is retired', async () => {
    const response = deferred<never>();
    const paywall = Object.assign(new Error('late plan limit'), {
      response: { status: 402, data: { featureName: 'Swan Coach' } },
    });
    postMock.mockImplementation((url: string) => (
      url === '/api/ai-chat/conversations'
        ? Promise.resolve(conversationResponse(910, null))
        : response.promise
    ));
    const { result } = renderHook(() => useAIChatB1('trainer'));

    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessageWithConversation('hello coach', 'coach_assistant'); });
    await waitFor(() => expect(postMock.mock.calls.some(([url]) => String(url).endsWith('/messages'))).toBe(true));
    act(() => { result.current.newChat(); });
    await act(async () => { response.reject(paywall); await pending; });

    expect(paywallState.showPaywall).not.toHaveBeenCalled();
  });

  it('rejects unknown user roles and malformed nullable IDs without widening scope', () => {
    expect(isAllowedRawRole('user')).toBe(false);
    expect(isAllowedRawRole('staff')).toBe(false);
    expect(parseStrictNullableId(undefined)).toBeUndefined();
    expect(parseStrictNullableId('0')).toBeUndefined();
    expect(isPublicationSnapshot({
      actorId: 7,
      rawRole: 'trainer',
      audienceRole: 'trainer',
      generation: 1,
      targetUserId: undefined,
      threadId: null,
      enabled: true,
    })).toBe(false);
  });

  it('does not issue transport for a malformed target or an unbound raw user', async () => {
    const { result, rerender } = renderHook(() => useAIChatB1());

    await act(async () => {
      await expect(result.current.sendMessageWithConversation(
        'hello coach',
        'coach_assistant',
        undefined,
        '004242',
      )).resolves.toBeNull();
    });
    expect(postMock).not.toHaveBeenCalled();

    authState.current.user = { id: '7', role: 'user' };
    rerender();
    await act(async () => {
      await expect(result.current.sendMessageWithConversation('hello coach', 'coach_assistant')).resolves.toBeNull();
    });
    expect(postMock).not.toHaveBeenCalled();
  });
  it.each([
    { id: 999 }, { role: 'admin' }, { targetUserId: 5151 },
    { targetUserId: undefined }, { messages: 'not an array' },
  ])('refuses a bound detail response outside its admitted thread contract: %j', async (override) => {
    const live = snapshot({ threadId: 901 });
    getMock.mockResolvedValue(conversationResponse(901, 4242, 'trainer', override));
    const { result } = renderHook(() => useAIChatB1('trainer', bind(() => live)));
    let returned: unknown;
    await act(async () => { returned = await result.current.loadConversation(901); });
    expect(returned).toBeNull();
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('preserves client self creation as explicit null even if a staff-style target was supplied', async () => {
    authState.current.user = { id: '42', role: 'client' };
    postMock.mockResolvedValue(conversationResponse(916, null, 'client'));
    const { result } = renderHook(() => useAIChatB1('client'));
    let created: unknown;
    await act(async () => { created = await result.current.createConversation('coach_assistant', undefined, 43); });
    expect(created).toMatchObject({ id: 916, role: 'client', targetUserId: null });
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][1]).not.toHaveProperty('targetUserId');
  });

  it('refuses a promoted create audience when the caller uses its default actual role', async () => {
    postMock.mockResolvedValue(conversationResponse(917, null, 'admin'));
    const { result } = renderHook(() => useAIChatB1());
    let created: unknown;
    await act(async () => { created = await result.current.createConversation('coach_assistant'); });
    expect(created).toBeNull();
    expect(result.current.activeConversation).toBeNull();
  });

  it('reuses the existing matching thread on successive send-with-conversation calls', async () => {
    postMock.mockImplementation(async url => url === '/api/ai-chat/conversations'
      ? conversationResponse(918, null)
      : messageResponse('real response', [], 918));
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.sendMessageWithConversation('one', 'coach_assistant'); });
    await act(async () => { await result.current.sendMessageWithConversation('two', 'coach_assistant'); });
    expect(postMock.mock.calls.filter(([url]) => url === '/api/ai-chat/conversations')).toHaveLength(1);
    expect(postMock.mock.calls.filter(([url]) => String(url).endsWith('/918/messages'))).toHaveLength(2);
    expect(result.current.activeConversation?.id).toBe(918);
  });

  it('does not dispatch actions or publish a malformed successful exchange', async () => {
    const malformed = messageResponse('invalid', [{ event: 'AI_ADD_EXERCISE', payload: {} }], 919);
    (malformed.data as any).assistantMessage = null;
    postMock.mockImplementation(async url => url === '/api/ai-chat/conversations'
      ? conversationResponse(919, null) : malformed);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.sendMessageWithConversation('one', 'coach_assistant'); });
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it('keeps a conversation visible when delete resolves with success:false', async () => {
    getMock.mockResolvedValue(conversationResponse(920, null));
    vi.mocked(apiService.delete).mockResolvedValue({ status: 200, data: { success: false } } as any);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(920); });
    await act(async () => { await result.current.deleteConversation(920); });
    expect(result.current.activeConversation?.id).toBe(920);
  });

  it('does not let an older rename response overwrite a newer rename', async () => {
    getMock.mockResolvedValue(conversationResponse(921, null));
    const first = deferred<any>(); const second = deferred<any>();
    vi.mocked(apiService.patch).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(921); });
    let oldRename!: Promise<void>; let latestRename!: Promise<void>;
    act(() => { oldRename = result.current.renameConversation(921, 'old'); latestRename = result.current.renameConversation(921, 'latest'); });
    await act(async () => { second.resolve({ status: 200, data: { success: true, conversation: { id: 921, title: 'latest' } } }); await latestRename; });
    await act(async () => { first.resolve({ status: 200, data: { success: true, conversation: { id: 921, title: 'old' } } }); await oldRename; });
    expect(result.current.activeConversation?.title).toBe('latest');
  });

  it.each(['rename', 'archive', 'delete'] as const)('retires an issued %s response across actor A-B-A', async operation => {
    getMock.mockResolvedValue(conversationResponse(922, null));
    const pending = deferred<any>();
    vi.mocked(apiService.patch).mockImplementation(() => pending.promise);
    vi.mocked(apiService.delete).mockImplementation(() => pending.promise);
    const { result, rerender } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(922); });
    let action!: Promise<void>;
    act(() => { action = operation === 'rename' ? result.current.renameConversation(922, 'old private title')
      : operation === 'archive' ? result.current.archiveConversation(922) : result.current.deleteConversation(922); });
    authState.current.user = { id: '8', role: 'trainer' }; rerender();
    authState.current.user = { id: '7', role: 'trainer' }; rerender();
    getMock.mockResolvedValue(conversationResponse(923, null, 'trainer', { title: 'new work' }));
    await act(async () => { await result.current.loadConversation(923); });
    await act(async () => { pending.resolve({ status: 200, data: { success: true, conversation: { id: 922, title: 'old private title' } } }); await action; });
    expect(result.current.activeConversation).toMatchObject({ id: 923, title: 'new work' });
    expect(result.current.error).toBeNull();
  });

  it('preserves only the original creation across committed disabled and acknowledged renders', async () => {
    let live = snapshot(); const ack = deferred<PublicationSnapshot | null>();
    const adopter = vi.fn().mockImplementation(() => ack.promise);
    postMock.mockImplementation(async url => url === '/api/ai-chat/conversations'
      ? conversationResponse(930, 4242) : messageResponse('adopted after render', [], 930));
    const { result, rerender } = renderHook(() => useAIChatB1('trainer', bind(() => live, adopter)));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessageWithConversation('hello coach', 'coach_assistant', undefined, 4242); });
    await waitFor(() => expect(adopter).toHaveBeenCalledTimes(1));
    live = snapshot({ enabled: false }); rerender();
    expect(result.current.publicationVisible).toBe(false);
    expect(postMock).toHaveBeenCalledTimes(1);
    live = snapshot({ threadId: 930 }); rerender();
    expect(postMock).toHaveBeenCalledTimes(1);
    await act(async () => { ack.resolve(live); await pending; });
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(result.current.activeConversation?.id).toBe(930);
    expect(result.current.messages.map(m => m.content)).toContain('adopted after render');
  });

  it('settles an adoption on unmount without waiting for its ignored acknowledgement', async () => {
    const live = snapshot(); const adopter = vi.fn().mockImplementation(() => new Promise(() => {}));
    postMock.mockResolvedValue(conversationResponse(931, 4242));
    const { result, unmount } = renderHook(() => useAIChatB1('trainer', bind(() => live, adopter)));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.sendMessageWithConversation('hello coach', 'coach_assistant', undefined, 4242); });
    await waitFor(() => expect(adopter).toHaveBeenCalledTimes(1));
    unmount();
    await expect(pending).resolves.toBeNull();
    expect(adopter.mock.calls[0][0].signal.aborted).toBe(true);
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('stops later events and the returned reply when the first event retires its scope', async () => {
    getMock.mockResolvedValue(conversationResponse(932, null));
    postMock.mockResolvedValue(messageResponse('retired reply', [
      { event: 'AI_ADD_EXERCISE', payload: { name: 'first' } },
      { event: 'AI_REMOVE_EXERCISE', payload: { name: 'later' } },
    ], 932));
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(932); });
    vi.mocked(window.dispatchEvent).mockImplementation(() => { result.current.newChat(); return true; });
    let reply: unknown;
    await act(async () => { reply = await result.current.sendMessage('hello coach'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(reply).toBeNull(); expect(result.current.messages).toEqual([]);
  });

  it('does not reuse the active history cache for an archived-history request', async () => {
    getMock.mockResolvedValueOnce({ status: 200, data: { success: true, conversations: [{ id: 933, status: 'active' }] } })
      .mockResolvedValueOnce({ status: 200, data: { success: true, conversations: [{ id: 934, status: 'archived' }] } });
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.listConversations('active'); });
    let rows: unknown;
    await act(async () => { rows = await result.current.listConversations('archived'); });
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(rows).toEqual([{ id: 934, status: 'archived' }]);
  });

  it('does not resurrect a deleted row from a list started before deletion', async () => {
    const listing = deferred<any>();
    getMock.mockResolvedValueOnce(conversationResponse(935, null)).mockImplementationOnce(() => listing.promise);
    vi.mocked(apiService.delete).mockResolvedValue({ status: 200, data: { success: true } } as any);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(935); });
    let pending!: Promise<unknown>; act(() => { pending = result.current.listConversations('active', true); });
    expect(getMock).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.deleteConversation(935); });
    expect(result.current.activeConversation).toBeNull();
    await act(async () => { listing.resolve({ status: 200, data: { success: true, conversations: [{ id: 935, status: 'active' }] } }); await pending; });
    expect(result.current.conversations).toEqual([]);
  });

  it.each(['rename', 'archive', 'delete'] as const)('publishes a successful current %s acknowledgement', async operation => {
    getMock.mockResolvedValue(conversationResponse(936, null));
    vi.mocked(apiService.patch).mockResolvedValue({ status: 200, data: { success: true, conversation: { id: 936, title: 'renamed', status: 'archived' } } } as any);
    vi.mocked(apiService.delete).mockResolvedValue({ status: 200, data: { success: true } } as any);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(936); });
    await act(async () => { await (operation === 'rename' ? result.current.renameConversation(936, 'renamed') : operation === 'archive' ? result.current.archiveConversation(936) : result.current.deleteConversation(936)); });
    if (operation === 'rename') expect(result.current.activeConversation?.title).toBe('renamed');
    else expect(result.current.activeConversation).toBeNull();
  });

  it('retires an issued send when another history thread is selected', async () => {
    const sending = deferred<any>(); getMock.mockImplementation(async url => conversationResponse(String(url).includes('/940') ? 940 : 941, null));
    postMock.mockImplementation(() => sending.promise);
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(940); });
    let oldSend!: Promise<unknown>; act(() => { oldSend = result.current.sendMessage('hello coach'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.loadConversation(941); });
    expect(result.current.activeConversation?.id).toBe(941);
    let returned: unknown;
    await act(async () => { sending.resolve(messageResponse('old private reply', [{ event: 'AI_ADD_EXERCISE' }], 940)); returned = await oldSend; });
    expect(returned).toBeNull(); expect(window.dispatchEvent).not.toHaveBeenCalled();
    expect(postMock.mock.calls[0][2].signal.aborted).toBe(true);
    expect(result.current.activeConversation?.id).toBe(941);
  });

  it('refuses a captured send callback after selecting another thread and returning', async () => {
    getMock.mockImplementation(async url => conversationResponse(String(url).includes('/942') ? 942 : 943, null));
    postMock.mockResolvedValue(messageResponse('wrong old callback', [{ event: 'AI_ADD_EXERCISE' }], 942));
    const { result } = renderHook(() => useAIChatB1('trainer'));
    await act(async () => { await result.current.loadConversation(942); });
    const oldSend = result.current.sendMessage;
    await act(async () => { await result.current.loadConversation(943); });
    await act(async () => { await result.current.loadConversation(942); });
    let returned: unknown; await act(async () => { returned = await oldSend('old unsent content'); });
    expect(returned).toBeNull(); expect(postMock).not.toHaveBeenCalled();
  });

});

