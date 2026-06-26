import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConversationListPanel from './ConversationListPanel';
import type { ConversationData, MessageParticipant } from './MessagingTypes';

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
  unreadCount: 2,
  viewerRole: 'owner',
  canManage: true,
  memberCount: 3,
  lastMessage: {
    content: 'Family board is live.',
    created_at: '2026-06-25T12:15:00.000Z',
    sender_id: coach.id,
  },
};

const directConversation: ConversationData = {
  id: 88,
  type: 'direct',
  name: null,
  created_at: '2026-06-25T12:00:00.000Z',
  updated_at: '2026-06-25T12:00:00.000Z',
  participants: [currentUser, member],
  unreadCount: 0,
  lastMessage: {
    content: 'Direct check-in.',
    created_at: '2026-06-25T12:11:00.000Z',
    sender_id: member.id,
  },
};

describe('ConversationListPanel group thread presentation', () => {
  it('marks group threads with member count and a dedicated groups filter', () => {
    render(
      <ConversationListPanel
        conversations={[groupConversation, directConversation]}
        activeConversationId={groupConversation.id}
        currentUserId={currentUser.id}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
        loading={false}
      />
    );

    expect(screen.getByLabelText('Group conversation Swan Family, 2 unread')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-group-avatar-77')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-group-badge-77')).toHaveTextContent('Group - 3 members');

    fireEvent.click(screen.getByRole('button', { name: 'groups' }));

    expect(screen.getByText('Swan Family')).toBeInTheDocument();
    expect(screen.queryByText('Jackie Sammons')).not.toBeInTheDocument();
  });
});