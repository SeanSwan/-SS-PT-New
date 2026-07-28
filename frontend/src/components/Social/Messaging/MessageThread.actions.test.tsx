import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageThread from './MessageThread';
import type { ComponentProps } from 'react';
import type { ConversationData, MessageData, MessageParticipant } from './MessagingTypes';

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

const baseMessage = {
  conversation_id: directConversation.id,
  created_at: '2026-06-30T17:05:00.000Z',
  updated_at: '2026-06-30T17:05:00.000Z',
  readBy: [],
};

const groupConversation: ConversationData = {
  ...directConversation,
  id: 8,
  type: 'group',
  name: 'Swan Family',
  participants: [currentUser, coach],
  viewerRole: 'owner',
  canManage: true,
  memberCount: 2,
};

function renderThread(overrides: Partial<ComponentProps<typeof MessageThread>> = {}) {
  const onSend = vi.fn();
  const onEditMessage = vi.fn(async () => null);
  const onDeleteMessage = vi.fn(async () => true);
  const onToggleReaction = vi.fn(async () => true);
  const onTogglePin = vi.fn(async () => true);
  const onToggleSave = vi.fn(async () => true);
  const onArchiveConversation = vi.fn(async () => true);
  const onMarkUnread = vi.fn(async () => true);
  const onSearchMessages = vi.fn(async () => [{ ...baseMessage, id: 'm-search', sender_id: coach.id, content: 'Needle found in the plan.' }]);
  const onMuteConversation = vi.fn(async () => true);
  const onUnmuteConversation = vi.fn(async () => true);
  const onBlockUser = vi.fn(async () => true);
  const onReportMessage = vi.fn(async () => true);
  const messages: MessageData[] = [
    { ...baseMessage, id: 'm-reply', sender_id: coach.id, content: 'Can you review the plan?', sender: coach },
    {
      ...baseMessage,
      id: 'm-own',
      sender_id: currentUser.id,
      content: 'I will update it.',
      sender: currentUser,
      edited_at: '2026-06-30T17:08:00.000Z',
      reactions: [{ id: 'r1', userId: currentUser.id, reaction: 'swan', createdAt: '2026-06-30T17:09:00.000Z' }],
      pins: [{ id: 'p1', pinnedBy: currentUser.id, createdAt: '2026-06-30T17:10:00.000Z' }],
      saves: [{ id: 's1', savedBy: currentUser.id, createdAt: '2026-06-30T17:11:00.000Z' }],
    },
  ];

  render(
    <MessageThread
      messages={messages}
      currentUserId={currentUser.id}
      participant={coach}
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
      onEditMessage={onEditMessage}
      onDeleteMessage={onDeleteMessage}
      onToggleReaction={onToggleReaction}
      onTogglePin={onTogglePin}
      onToggleSave={onToggleSave}
      onArchiveConversation={onArchiveConversation}
      onMarkUnread={onMarkUnread}
      onSearchMessages={onSearchMessages}
      onMuteConversation={onMuteConversation}
      onUnmuteConversation={onUnmuteConversation}
      onBlockUser={onBlockUser}
      onReportMessage={onReportMessage}
      {...overrides}
    />
  );

  return { onSend, onEditMessage, onDeleteMessage, onToggleReaction, onTogglePin, onToggleSave, onArchiveConversation, onMarkUnread, onSearchMessages, onMuteConversation, onUnmuteConversation, onBlockUser, onReportMessage };
}

describe('MessageThread message actions', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('sends replies through the composer with a reply target', () => {
    const { onSend } = renderThread();

    fireEvent.click(screen.getByRole('button', { name: /reply to message: can you review the plan/i }));
    expect(screen.getByText(/Replying to Mira Coach/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'Reply confirmed.' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('Reply confirmed.', { replyToMessageId: 'm-reply' });
  });

  it('composes governed internal attachments and renders message attachments', () => {
    const { onSend } = renderThread({
      messages: [
        {
          ...baseMessage,
          id: 'm-attachment',
          sender_id: coach.id,
          content: '',
          sender: coach,
          attachments: [
            { id: 'a1', kind: 'link', title: 'Workout plan', url: '/dashboard/client/workouts', scanStatus: 'not_required' },
          ],
        },
      ],
    });

    expect(screen.getByRole('link', { name: /open link attachment workout plan/i })).toHaveAttribute('href', '/dashboard/client/workouts');

    fireEvent.click(screen.getByRole('button', { name: /add internal attachment/i }));
    fireEvent.change(screen.getByLabelText(/attachment title/i), { target: { value: 'Progress chart' } });
    fireEvent.change(screen.getByLabelText(/internal app path/i), { target: { value: '/dashboard/client/progress' } });
    fireEvent.click(screen.getByRole('button', { name: /attach internal link/i }));

    expect(screen.getByText('Link: Progress chart')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'Review this.' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('Review this.', {
      attachments: [{ kind: 'link', title: 'Progress chart', url: '/dashboard/client/progress' }],
    });
  });
  it.each([
    ['workout_card', 'Workout', 'workout', '/dashboard/client/workouts/42'],
    ['session_card', 'Session', 'session', '/dashboard/client/sessions/42'],
    ['nutrition_card', 'Nutrition', 'nutrition', '/dashboard/client/nutrition/42'],
  ] as const)('composes governed %s attachments with matching entity references', (kind, label, entityType, url) => {
    const { onSend } = renderThread();
    const title = `${label} plan`;
    const body = `Review this ${label.toLowerCase()} card.`;

    fireEvent.click(screen.getByRole('button', { name: /add internal attachment/i }));
    fireEvent.change(screen.getByLabelText(/attachment type/i), { target: { value: kind } });
    fireEvent.change(screen.getByLabelText(/attachment title/i), { target: { value: title } });
    fireEvent.change(screen.getByLabelText(/internal app path/i), { target: { value: url } });
    fireEvent.change(screen.getByLabelText(new RegExp(`${label} reference id`, 'i')), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`attach ${label} card`, 'i') }));

    expect(screen.getByText(`${label}: ${title}`)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: body } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith(body, {
      attachments: [{ kind, title, url, entityType, entityId: 42 }],
    });
  });
  it('clears attachment drafts when switching into edit mode', () => {
    const { onSend, onEditMessage } = renderThread();

    fireEvent.click(screen.getByRole('button', { name: /add internal attachment/i }));
    fireEvent.change(screen.getByLabelText(/attachment title/i), { target: { value: 'Progress chart' } });
    fireEvent.change(screen.getByLabelText(/internal app path/i), { target: { value: '/dashboard/client/progress' } });
    fireEvent.click(screen.getByRole('button', { name: /attach internal link/i }));
    expect(screen.getByText('Link: Progress chart')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit message: i will update it/i }));
    expect(screen.queryByText('Link: Progress chart')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'Edited without attachments.' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(onEditMessage).toHaveBeenCalledWith('m-own', 'Edited without attachments.');

    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'Fresh message.' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(onSend).toHaveBeenCalledWith('Fresh message.', undefined);
  });
  it('edits and deletes own messages without exposing controls on other messages', () => {
    const { onEditMessage, onDeleteMessage } = renderThread();

    expect(screen.queryByRole('button', { name: /edit message: can you review/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /edit message: i will update it/i }));
    expect(screen.getByText(/Editing message/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'Updated plan note.' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onEditMessage).toHaveBeenCalledWith('m-own', 'Updated plan note.');

    fireEvent.click(screen.getByRole('button', { name: /delete message: i will update it/i }));
    expect(onDeleteMessage).toHaveBeenCalledWith('m-own');
  });

  it('labels group reply targets from the participant roster when sender payloads are compact', () => {
    renderThread({
      conversation: groupConversation,
      conversationId: groupConversation.id,
      messages: [{ ...baseMessage, conversation_id: groupConversation.id, id: 'm-roster', sender_id: coach.id, content: 'Roster-only context.' }],
    });

    fireEvent.click(screen.getByRole('button', { name: /reply to message: roster-only context/i }));

    expect(screen.getByText(/Replying to Mira Coach/i)).toBeInTheDocument();
    expect(screen.queryByText(/Replying to Swan Family/i)).not.toBeInTheDocument();
  });

  it('searches inside the thread and exposes conversation archive controls', async () => {
    const { onArchiveConversation, onMarkUnread, onSearchMessages } = renderThread();

    fireEvent.click(screen.getByRole('button', { name: /search this conversation/i }));
    fireEvent.change(screen.getByLabelText(/search messages in this conversation/i), { target: { value: 'needle' } });
    fireEvent.click(screen.getByRole('button', { name: /run message search/i }));

    expect(await screen.findByText(/Needle found in the plan/i)).toBeInTheDocument();
    expect(onSearchMessages).toHaveBeenCalledWith(7, 'needle');

    fireEvent.click(screen.getByRole('button', { name: /mark conversation unread/i }));
    expect(onMarkUnread).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole('button', { name: /archive conversation/i }));
    expect(onArchiveConversation).toHaveBeenCalledWith(7);
  });

  it('reports unsafe messages and exposes mute and block controls', () => {
    const { onMuteConversation, onBlockUser, onReportMessage } = renderThread();

    fireEvent.click(screen.getByRole('button', { name: /report message: can you review the plan/i }));
    fireEvent.change(screen.getByLabelText(/report reason/i), { target: { value: 'spam' } });
    fireEvent.change(screen.getByLabelText(/optional report details/i), { target: { value: 'Repeated sales pitch' } });
    fireEvent.click(screen.getByRole('button', { name: /submit message report/i }));

    expect(onReportMessage).toHaveBeenCalledWith('m-reply', 'spam', 'Repeated sales pitch');

    fireEvent.click(screen.getByRole('button', { name: /mute conversation/i }));
    expect(onMuteConversation).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole('button', { name: /block mira coach/i }));
    expect(onBlockUser).toHaveBeenCalledWith(204);
  });

  it('exposes unmute when the conversation is muted', () => {
    const { onUnmuteConversation } = renderThread({ conversation: { ...directConversation, isMuted: true } });

    fireEvent.click(screen.getByRole('button', { name: /unmute conversation/i }));

    expect(onUnmuteConversation).toHaveBeenCalledWith(7);
  });

  it('matches string viewer ids when rendering saved, pinned, and reaction states', () => {
    renderThread({ currentUserId: String(currentUser.id) });

    expect(screen.getByRole('button', { name: /remove swan reaction from message: i will update it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unpin message: i will update it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unsave message: i will update it/i })).toBeInTheDocument();
  });

  it('surfaces reaction, pin, save, edited, and reply metadata controls', () => {
    const { onToggleReaction, onTogglePin, onToggleSave } = renderThread();

    expect(screen.getByText('Edited')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove swan reaction from message: i will update it/i }));
    expect(onToggleReaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'm-own' }), 'swan');

    fireEvent.click(screen.getByRole('button', { name: /unpin message: i will update it/i }));
    expect(onTogglePin).toHaveBeenCalledWith(expect.objectContaining({ id: 'm-own' }));

    fireEvent.click(screen.getByRole('button', { name: /unsave message: i will update it/i }));
    expect(onToggleSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'm-own' }));
  });
});