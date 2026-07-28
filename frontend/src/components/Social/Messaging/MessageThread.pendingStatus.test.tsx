import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageThread from './MessageThread';
import type { ConversationData, MessageData, MessageParticipant, PendingMessage } from './MessagingTypes';

const currentUser: MessageParticipant = {
  id: 103,
  firstName: 'Sean',
  lastName: 'Swan',
  username: 'sean',
  photo: null,
  role: 'admin',
};

const coach: MessageParticipant = {
  id: 204,
  firstName: 'Mira',
  lastName: 'Coach',
  username: 'mira',
  photo: null,
  role: 'trainer',
};

const directConversation: ConversationData = {
  id: 7,
  type: 'direct',
  name: null,
  created_at: '2026-06-30T17:00:00.000Z',
  updated_at: '2026-06-30T17:00:00.000Z',
  participants: [currentUser, coach],
  unreadCount: 0,
};

const ownMessageBase = {
  conversation_id: directConversation.id,
  sender_id: currentUser.id,
  created_at: '2026-06-30T17:05:00.000Z',
  updated_at: '2026-06-30T17:05:00.000Z',
};

function renderThread(messages: MessageData[], pendingMessages: PendingMessage[], onRetryMessage = vi.fn()) {
  render(
    <MessageThread
      messages={messages}
      currentUserId={currentUser.id}
      participant={coach}
      conversation={directConversation}
      onSend={vi.fn()}
      onBack={vi.fn()}
      onTyping={vi.fn()}
      onDismissError={vi.fn()}
      onRetryMessage={onRetryMessage}
      loading={false}
      hasConversation
      typingUsers={[]}
      isParticipantOnline
      connected
      conversationId={directConversation.id}
      error={null}
      pendingMessages={pendingMessages}
      searchUsers={vi.fn(async () => [])}
      onRenameConversation={vi.fn(async () => directConversation)}
      onAddParticipants={vi.fn(async () => directConversation)}
      onUpdateParticipantRole={vi.fn(async () => directConversation)}
      onRemoveParticipant={vi.fn(async () => true)}
    />
  );
}

describe('MessageThread pending and delivery states', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders sending, failed, sent, delivered, and read states with retry', () => {
    const retryMessage = vi.fn();

    renderThread([
      { ...ownMessageBase, id: 'sent-1', content: 'Server accepted.', readBy: [] },
      { ...ownMessageBase, id: 'delivered-1', content: 'Socket accepted.', clientMessageId: 'client-delivered', readBy: [] },
      {
        ...ownMessageBase,
        id: 'read-1',
        content: 'Client has read this.',
        readBy: [{ userId: coach.id, readAt: '2026-06-30T17:08:00.000Z' }],
      },
    ], [
      { clientMessageId: 'pending-1', conversationId: 7, content: 'Still sending.', status: 'pending' },
      { clientMessageId: 'failed-1', conversationId: 7, content: 'Needs retry.', status: 'failed' },
    ], retryMessage);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByText('Not sent')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry message: needs retry/i }));
    expect(retryMessage).toHaveBeenCalledWith('failed-1');
  });
});