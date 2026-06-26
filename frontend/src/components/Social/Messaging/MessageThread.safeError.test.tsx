import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGING_ERROR_MESSAGES } from './messagingSafeErrors';
import MessageThread from './MessageThread';
import type { MessageParticipant } from './MessagingTypes';

const participant: MessageParticipant = {
  id: 2,
  firstName: 'Jackie',
  lastName: 'Sammons',
  username: 'jackie',
  photo: null,
  role: 'client',
};

describe('MessageThread safe error display', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('sanitizes any raw ErrorState before rendering it in the thread banner', () => {
    render(
      <MessageThread
        messages={[]}
        currentUserId={1}
        participant={participant}
        onSend={vi.fn()}
        onBack={vi.fn()}
        onTyping={vi.fn()}
        onDismissError={vi.fn()}
        loading={false}
        hasConversation
        typingUsers={[]}
        isParticipantOnline={false}
        connected={false}
        conversationId={7}
        error={{
          message: 'SequelizeConnectionError: password authentication failed for user swanadmin',
          type: 'transient',
          timestamp: Date.now(),
        }}
        pendingMessages={[]}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGING_ERROR_MESSAGES.generic);
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });
});
