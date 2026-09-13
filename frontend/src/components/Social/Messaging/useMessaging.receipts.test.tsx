import { useEffect } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessaging } from './useMessaging';
import MessageThread from './MessageThread';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
const socketMocks = vi.hoisted(() => ({ emit: vi.fn(), on: vi.fn((_event: string, _handler: (...args: unknown[]) => void) => vi.fn()), connected: true }));

vi.mock('../../../services/api.service', () => ({ default: apiMocks }));
vi.mock('../../../hooks/useSocket', () => ({
  useSocket: () => ({ connected: socketMocks.connected, connectionState: 'connected', emit: socketMocks.emit, on: socketMocks.on }),
}));

const savedMessage = {
  id: 88,
  conversation_id: 7,
  sender_id: 103,
  content: 'authoritative receipt',
  created_at: '2026-09-12T20:00:00.000Z',
  updated_at: '2026-09-12T20:00:00.000Z',
};

describe('useMessaging authoritative send receipts', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockReset();
    socketMocks.on.mockReset().mockReturnValue(vi.fn());
    socketMocks.connected = true;
    apiMocks.get.mockResolvedValue({ data: [] });
  });

  it('uses one REST send and clears pending only after the canonical DTO arrives', async () => {
    let resolvePost!: (value: unknown) => void;
    apiMocks.post.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setActiveConversationId(7); });
    let send!: Promise<boolean>;
    act(() => { send = result.current.sendMessage('authoritative receipt'); });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(socketMocks.emit).not.toHaveBeenCalledWith('send_message', expect.anything());
    expect(result.current.pendingMessages).toEqual(['authoritative receipt']);

    await act(async () => {
      resolvePost({ data: savedMessage });
      await send;
    });

    expect(result.current.pendingMessages).toEqual([]);
    expect(result.current.messages).toEqual([expect.objectContaining({ id: 88, content: 'authoritative receipt' })]);
  });

  it('does not duplicate a pending send and ends pending status on failure', async () => {
    let rejectPost!: (error: Error) => void;
    apiMocks.post.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectPost = reject; }));
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setActiveConversationId(7); });
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.sendMessage('keep this draft');
      void result.current.sendMessage('keep this draft');
    });
    expect(apiMocks.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectPost(new Error('network')); await first;
    });

    expect(result.current.pendingMessages).toEqual([]);
    expect(result.current.error?.type).toBe('persistent');
  });

  it('ignores a late receipt after the conversation changes', async () => {
    let resolvePost!: (value: unknown) => void;
    apiMocks.post.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));
    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setActiveConversationId(7); });
    let send!: Promise<boolean>;
    act(() => { send = result.current.sendMessage('old thread'); });
    act(() => { result.current.setActiveConversationId(8); });
    await act(async () => {
      resolvePost({ data: savedMessage }); await send;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.pendingMessages).toEqual([]);
  });

  it('ignores old-account reads and finalizers while the new account is loading', async () => {
    let resolveOld!: (value: unknown) => void;
    let resolveNew!: (value: unknown) => void;
    apiMocks.get.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveNew = resolve; }));
    const { result, rerender } = renderHook(({ owner }) => useMessaging(owner), { initialProps: { owner: 103 } });
    rerender({ owner: 204 });
    await act(async () => resolveOld({ data: [{ id: 7, name: 'Old owner synthetic', participants: [] }] }));
    expect(result.current.conversations).toEqual([]);
    expect(result.current.loading).toBe(true);
    await act(async () => resolveNew({ data: [{ id: 8, name: 'Current owner', participants: [] }] }));
    expect(result.current.conversations.map(item => item.id)).toEqual([8]);
  });

  it('does not accept the first A response after A to B to A', async () => {
    let resolveOld!: (value: unknown) => void;
    apiMocks.get.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ owner }) => useMessaging(owner), { initialProps: { owner: 103 } });
    rerender({ owner: 204 });
    rerender({ owner: 103 });
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledTimes(3));
    await act(async () => resolveOld({ data: [{ id: 7, name: 'Stale first A', participants: [] }] }));
    expect(result.current.conversations).toEqual([]);
  });

  it('clears loaded conversation and message state when the actor changes', async () => {
    apiMocks.get.mockImplementation((url: string) => Promise.resolve({ data: url.includes('/messages')
      ? [savedMessage] : [{ id: 7, name: 'Actor A', participants: [] }] }));
    const { result, rerender } = renderHook(({ owner }) => useMessaging(owner), { initialProps: { owner: 103 } });
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    act(() => result.current.selectConversation(7));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    apiMocks.get.mockReturnValue(new Promise(() => {}));
    const oldTyping = result.current.emitTyping;
    const oldRead = result.current.markAsRead;
    socketMocks.emit.mockClear();
    rerender({ owner: 204 });
    act(() => { oldTyping(); oldRead(7, 88); });
    expect(socketMocks.emit).not.toHaveBeenCalledWith('mark_as_read', expect.anything());
    expect(socketMocks.emit).not.toHaveBeenCalledWith('is_typing', expect.anything());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('does not return old-actor create or search results', async () => {
    let resolveCreate!: (value: unknown) => void;
    let resolveSearch!: (value: unknown) => void;
    apiMocks.post.mockReturnValueOnce(new Promise(resolve => { resolveCreate = resolve; }));
    apiMocks.get.mockImplementation((url: string) => url.includes('/users/search')
      ? new Promise(resolve => { resolveSearch = resolve; }) : Promise.resolve({ data: [] }));
    const { result, rerender } = renderHook(({ owner }) => useMessaging(owner), { initialProps: { owner: 103 } });
    let creating!: ReturnType<typeof result.current.createConversation>;
    let searching!: ReturnType<typeof result.current.searchUsers>;
    act(() => { creating = result.current.createConversation(501); searching = result.current.searchUsers('synthetic'); });
    rerender({ owner: 204 });
    let created: unknown, searched: unknown;
    await act(async () => {
      resolveCreate({ data: { id: 7, name: 'Old create', participants: [] } });
      resolveSearch({ data: [{ id: 501, firstName: 'Old search' }] });
      created = await creating; searched = await searching;
    });
    expect(created).toBeNull();
    expect(searched).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('ends pending state for malformed receipts with persistent recovery', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useMessaging(103));
    act(() => result.current.setActiveConversationId(7));
    await act(async () => expect(await result.current.sendMessage('uncertain draft')).toBe(false));
    expect(result.current.pendingMessages).toEqual([]);
    expect(result.current.error?.type).toBe('persistent');
  });

  it('keeps one persisted echo and removes the pending bubble if the REST response is lost', async () => {
    let rejectPost!: (error: Error) => void;
    apiMocks.post.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectPost = reject; }));
    const { result } = renderHook(() => useMessaging(103));
    act(() => result.current.setActiveConversationId(7));
    let send!: Promise<boolean>;
    act(() => { send = result.current.sendMessage(savedMessage.content); });
    const handler = socketMocks.on.mock.calls.find(call => call[0] === 'new_message')?.[1] as ((data: unknown) => void) | undefined;
    expect(handler).toBeTypeOf('function');
    act(() => handler?.(savedMessage));
    await act(async () => { rejectPost(new Error('lost response')); await send; });
    expect(result.current.messages.map(message => message.id)).toEqual([88]);
    expect(result.current.pendingMessages).toEqual([]);
    expect(apiMocks.post).toHaveBeenCalledTimes(1);
  });

  it.each(['rejected', 'malformed'])('keeps the mounted composer draft but removes Sending after a %s outcome', async (outcome) => {
    let resolvePost!: (value: unknown) => void;
    let rejectPost!: (error: Error) => void;
    apiMocks.post.mockReturnValueOnce(new Promise((resolve, reject) => { resolvePost = resolve; rejectPost = reject; }));
    function Harness() {
      const messaging = useMessaging(103);
      const { selectConversation } = messaging;
      useEffect(() => { selectConversation(7); }, [selectConversation]);
      return <MessageThread {...messaging} currentUserId={103} participant={null} conversation={null}
        onSend={messaging.sendMessage} onTyping={messaging.emitTyping} onBack={() => {}}
        onDismissError={messaging.dismissError} loading={false} hasConversation conversationId={7}
        isParticipantOnline={false} onRenameConversation={messaging.renameConversation}
        onAddParticipants={messaging.addConversationParticipants} onUpdateParticipantRole={messaging.updateParticipantRole}
        onRemoveParticipant={messaging.removeConversationParticipant} />;
    }
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Message input' });
    fireEvent.change(input, { target: { value: 'retained draft' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    await act(async () => outcome === 'rejected' ? rejectPost(new Error('lost response')) : resolvePost({ data: {} }));
    expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    expect(input).toHaveValue('retained draft');
    expect(screen.getByRole('alert')).toHaveTextContent(/not be confirmed/i);
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled();
  });
});
