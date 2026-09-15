import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageThread from './MessageThread';

const baseProps = {
  messages: [], currentUserId: 1, participant: null, conversation: null,
  onBack: vi.fn(), onTyping: vi.fn(), onDismissError: vi.fn(), loading: false,
  hasConversation: true, typingUsers: [], isParticipantOnline: false, connected: true,
  conversationId: 7, error: null, pendingMessages: [], searchUsers: vi.fn(),
  onRenameConversation: vi.fn(), onAddParticipants: vi.fn(), onUpdateParticipantRole: vi.fn(), onRemoveParticipant: vi.fn(),
};

describe('MessageThread receipt lifecycle', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('clears only after the awaited send receipt succeeds', async () => {
    let resolveSend!: (value: boolean) => void;
    const onSend = vi.fn(() => new Promise<boolean>((resolve) => { resolveSend = resolve; }));
    render(<MessageThread {...baseProps} onSend={onSend} />);
    const input = screen.getByRole('textbox', { name: 'Message input' });

    fireEvent.change(input, { target: { value: 'keep until saved' } });
    fireEvent.submit(input.closest('form')!);
    expect(input).toHaveValue('keep until saved');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();

    await act(async () => { resolveSend(true); });
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('retains the exact draft after rejection and does not erase a changed draft on late success', async () => {
    let resolveSend!: (value: boolean) => void;
    const onSend = vi.fn(() => new Promise<boolean>((resolve) => { resolveSend = resolve; }));
    const { rerender } = render(<MessageThread {...baseProps} onSend={onSend} />);
    const input = screen.getByRole('textbox', { name: 'Message input' });

    fireEvent.change(input, { target: { value: 'first draft' } });
    fireEvent.submit(input.closest('form')!);
    fireEvent.change(input, { target: { value: 'new draft' } });
    await act(async () => { resolveSend(true); });
    expect(input).toHaveValue('new draft');
    rerender(<MessageThread {...baseProps} onSend={vi.fn().mockResolvedValue(false)} />);
    expect(input).toHaveValue('new draft');
  });

  it('clears the previous actor draft and ignores its late receipt after A to B to A', async () => {
    let resolveOld!: (value: boolean) => void;
    const onSend = vi.fn(() => new Promise<boolean>(resolve => { resolveOld = resolve; }));
    const { rerender } = render(<MessageThread {...baseProps} onSend={onSend} />);
    const input = screen.getByRole('textbox', { name: 'Message input' });
    fireEvent.change(input, { target: { value: 'private draft' } });
    fireEvent.submit(input.closest('form')!);
    rerender(<MessageThread {...baseProps} currentUserId={2} onSend={onSend} />);
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    rerender(<MessageThread {...baseProps} onSend={onSend} />);
    fireEvent.change(input, { target: { value: 'private draft' } });
    await act(async () => resolveOld(true));
    expect(input).toHaveValue('private draft');
  });

  it('does not carry a draft into another conversation', () => {
    const { rerender } = render(<MessageThread {...baseProps} onSend={vi.fn().mockResolvedValue(true)} />);
    const input = screen.getByRole('textbox', { name: 'Message input' });
    fireEvent.change(input, { target: { value: 'for the old recipient' } });
    rerender(<MessageThread {...baseProps} conversationId={8} onSend={vi.fn().mockResolvedValue(true)} />);
    expect(input).toHaveValue('');
  });
});
