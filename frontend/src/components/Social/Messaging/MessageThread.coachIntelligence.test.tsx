import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageThread from './MessageThread';
import type { ConversationData, MessageData, MessageParticipant } from './MessagingTypes';

const currentUser: MessageParticipant = {
  id: 103,
  firstName: 'Sean',
  lastName: 'Swan',
  username: 'sean',
  photo: null,
  role: 'admin',
};

const client: MessageParticipant = {
  id: 204,
  firstName: 'Mira',
  lastName: 'Client',
  username: 'mira',
  photo: null,
  role: 'client',
};

const directConversation: ConversationData = {
  id: 7,
  type: 'direct',
  name: null,
  created_at: '2026-06-30T17:00:00.000Z',
  updated_at: '2026-06-30T17:00:00.000Z',
  participants: [currentUser, client],
  unreadCount: 1,
};

const baseMessage = {
  conversation_id: directConversation.id,
  created_at: '2026-06-30T17:05:00.000Z',
  updated_at: '2026-06-30T17:05:00.000Z',
  readBy: [],
};

function renderThread(messages: MessageData[]) {
  const onSend = vi.fn();

  render(
    <MessageThread
      messages={messages}
      currentUserId={currentUser.id}
      participant={client}
      conversation={directConversation}
      onSend={onSend}
      onBack={vi.fn()}
      onTyping={vi.fn()}
      onDismissError={vi.fn()}
      loading={false}
      hasConversation
      typingUsers={[]}
      isParticipantOnline
      connected
      conversationId={directConversation.id}
      error={null}
      pendingMessages={[]}
      searchUsers={vi.fn(async () => [])}
      onRenameConversation={vi.fn(async () => directConversation)}
      onAddParticipants={vi.fn(async () => directConversation)}
      onUpdateParticipantRole={vi.fn(async () => directConversation)}
      onRemoveParticipant={vi.fn(async () => true)}
      onEditMessage={vi.fn(async () => null)}
      onDeleteMessage={vi.fn(async () => true)}
      onToggleReaction={vi.fn(async () => true)}
      onTogglePin={vi.fn(async () => true)}
      onArchiveConversation={vi.fn(async () => true)}
      onMarkUnread={vi.fn(async () => true)}
      onMuteConversation={vi.fn(async () => true)}
      onUnmuteConversation={vi.fn(async () => true)}
      onBlockUser={vi.fn(async () => true)}
      onReportMessage={vi.fn(async () => true)}
      onSearchMessages={vi.fn(async () => [])}
    />
  );

  return { onSend };
}

describe('MessageThread Swan Coach intelligence', () => {
  it('renders a safe read-only Coach brief and can fill a suggested reply without sending', () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { onSend } = renderThread([
      {
        ...baseMessage,
        id: 'm-injury',
        sender_id: client.id,
        content: 'My knee pain flared after squats and I may miss the session.',
        sender: client,
      },
      {
        ...baseMessage,
        id: 'm-own',
        sender_id: currentUser.id,
        content: 'I will check your plan.',
        sender: currentUser,
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /summarize thread with swan coach/i }));

    expect(screen.getByRole('region', { name: /swan coach thread brief/i })).toBeInTheDocument();
    expect(screen.getByText(/injury risk/i)).toBeInTheDocument();
    expect(screen.getByText(/session change/i)).toBeInTheDocument();
    expect(screen.getByText(/Task seed/i)).toBeInTheDocument();

    const coachLink = screen.getByRole('link', { name: /open swan coach/i });
    expect(coachLink).toHaveAttribute('href', '/dashboard/admin/coach-assistant?source=messages&intent=summarize_messages&threadId=7&sourcePath=%2Fdashboard%2Fadmin%2Fmessages');

    const actionLinks = [
      screen.getByRole('link', { name: /create task from message/i }),
      screen.getByRole('link', { name: /schedule from message/i }),
      screen.getByRole('link', { name: /log workout from message/i }),
    ];
    expect(actionLinks[0]).toHaveAttribute('href', '/dashboard/admin/coach-assistant?source=messages&intent=create_task_from_message&threadId=7&sourceMessageId=m-injury&sourcePath=%2Fdashboard%2Fadmin%2Fmessages');
    expect(actionLinks[1]).toHaveAttribute('href', '/dashboard/admin/coach-assistant?source=messages&intent=schedule_from_message&threadId=7&sourceMessageId=m-injury&sourcePath=%2Fdashboard%2Fadmin%2Fmessages');
    expect(actionLinks[2]).toHaveAttribute('href', '/dashboard/admin/coach-assistant?source=messages&intent=log_workout_from_message&threadId=7&sourceMessageId=m-injury&sourcePath=%2Fdashboard%2Fadmin%2Fmessages');
    [coachLink, ...actionLinks].forEach(link => {
      expect(link.getAttribute('href')).not.toContain('conversationId');
      expect(link.getAttribute('href')).not.toContain('knee');
      expect(link.getAttribute('href')).not.toContain('squats');
    });

    fireEvent.click(screen.getByRole('button', { name: /use suggested reply/i }));
    expect((screen.getByLabelText('Message input') as HTMLTextAreaElement).value).toContain('pause');
    expect(onSend).not.toHaveBeenCalled();
  });
});