import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageThread from './MessageThread';
import type { ConversationData, MessageData, MessageParticipant } from './MessagingTypes';

const currentUser: MessageParticipant = {
  id: 1,
  firstName: 'Sean',
  lastName: 'Swan',
  username: 'sean',
  photo: null,
  role: 'admin',
  groupRole: 'owner',
};

const coach: MessageParticipant = {
  id: 2,
  firstName: 'Mira',
  lastName: 'Coach',
  username: 'mira',
  photo: null,
  role: 'trainer',
  groupRole: 'admin',
};

const member: MessageParticipant = {
  id: 3,
  firstName: 'Jackie',
  lastName: 'Sammons',
  username: 'jackie',
  photo: null,
  role: 'client',
  groupRole: 'member',
};

const groupConversation: ConversationData = {
  id: 77,
  type: 'group',
  name: 'Swan Family',
  created_at: '2026-06-25T12:00:00.000Z',
  updated_at: '2026-06-25T12:00:00.000Z',
  participants: [currentUser, coach, member],
  unreadCount: 0,
  viewerRole: 'owner',
  canManage: true,
  memberCount: 3,
};

const baseMessage = {
  conversation_id: 77,
  created_at: '2026-06-25T12:10:00.000Z',
  updated_at: '2026-06-25T12:10:00.000Z',
  readBy: [],
};

function renderGroupThread(messages: MessageData[]) {
  return render(
    <MessageThread
      messages={messages}
      currentUserId={currentUser.id}
      participant={coach}
      conversation={groupConversation}
      onSend={vi.fn()}
      onBack={vi.fn()}
      onTyping={vi.fn()}
      onDismissError={vi.fn()}
      loading={false}
      hasConversation
      typingUsers={[]}
      isParticipantOnline={false}
      connected
      conversationId={groupConversation.id}
      error={null}
      pendingMessages={[]}
      searchUsers={vi.fn(async () => [])}
      onRenameConversation={vi.fn(async () => groupConversation)}
      onAddParticipants={vi.fn(async () => groupConversation)}
      onUpdateParticipantRole={vi.fn(async () => groupConversation)}
      onRemoveParticipant={vi.fn(async () => true)}
    />
  );
}

describe('MessageThread group identity presentation', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders group messages with speaker labels, role badges, and group-aware composer copy', () => {
    renderGroupThread([
      {
        ...baseMessage,
        id: 'm1',
        sender_id: coach.id,
        content: 'New benchmark posted for the family board.',
        sender: coach,
      },
      {
        ...baseMessage,
        id: 'm2',
        sender_id: currentUser.id,
        content: 'Lock it in for the next session.',
        sender: currentUser,
      },
      {
        ...baseMessage,
        id: 'm3',
        sender_id: member.id,
        content: 'I am ready.',
      },
    ]);

    expect(screen.getByTestId('group-message-speaker-2')).toHaveTextContent('Mira Coach');
    expect(screen.getByTestId('group-message-role-2')).toHaveTextContent('Admin');
    expect(screen.getByTestId('group-message-speaker-1')).toHaveTextContent('You');
    expect(screen.getByTestId('group-message-role-1')).toHaveTextContent('Owner');
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByTestId('group-message-speaker-3')).toHaveTextContent('Jackie Sammons');
    expect(screen.getByTestId('group-message-role-3')).toHaveTextContent('Member');
    expect(screen.getByLabelText('Message Swan Family')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message Swan Family...')).toBeInTheDocument();
  });
});
