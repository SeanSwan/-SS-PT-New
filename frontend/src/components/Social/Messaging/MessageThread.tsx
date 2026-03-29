/**
 * ┌─── SUB-COMPONENT: MessageThread ───────────────────────────┐
 * │ PARENT: MessagingView                                       │
 * │ PURPOSE: Right panel — messages, compose, typing, presence  │
 * │ AI VILLAGE VALIDATED: 2026-03-29 (11-Brain Consensus)       │
 * │ FIXES: Scroll-jacking, WCAG contrast, textarea, optimistic │
 * │        UI, error banner, ARIA labels, read receipts         │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCheck, Check, AlertTriangle, Loader2, X } from 'lucide-react';
import type { MessageData, MessageParticipant } from './MessagingTypes';
import type { TypingUser, ErrorState } from './useMessaging';
import {
  ThreadPanel, ThreadHeader, BackButton, Avatar, ThreadUserName,
  ThreadUserRole, MessageArea, MessageBubble, MessageText, MessageTime,
  DateDivider, ComposeBar, SendButton, EmptyState,
  EmptyIcon, EmptyTitle, EmptySubtext, SkeletonLine,
  AvatarWrap, OnlineBadge, TypingIndicator, TypingDots, TypingText,
  ConnectionStatus, StatusDot, ErrorBanner, MessageTextArea, PendingBubble,
} from './MessagingStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function getInitials(p: MessageParticipant | null): string {
  if (!p) return '?';
  return `${(p.firstName?.[0] || '').toUpperCase()}${(p.lastName?.[0] || '').toUpperCase()}`;
}

function groupByDate(msgs: MessageData[]): { date: string; messages: MessageData[] }[] {
  const groups: { date: string; messages: MessageData[] }[] = [];
  let currentDate = '';

  for (const msg of msgs) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface Props {
  messages: MessageData[];
  currentUserId: number;
  participant: MessageParticipant | null;
  onSend: (content: string) => void;
  onBack: () => void;
  onTyping: () => void;
  onDismissError: () => void;
  loading: boolean;
  mobileHidden?: boolean;
  hasConversation: boolean;
  typingUsers: TypingUser[];
  isParticipantOnline: boolean;
  connected: boolean;
  conversationId: string | number | null;
  error: ErrorState | null;
  pendingMessages: string[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const MessageThread: React.FC<Props> = ({
  messages,
  currentUserId,
  participant,
  onSend,
  onBack,
  onTyping,
  onDismissError,
  loading,
  mobileHidden,
  hasConversation,
  typingUsers,
  isParticipantOnline,
  connected,
  conversationId,
  error,
  pendingMessages,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // AI Village fix: only auto-scroll if user is near bottom (prevents scroll-jacking)
  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, pendingMessages.length]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue('');
  }, [inputValue, onSend]);

  // AI Village fix: textarea with Shift+Enter for newline, Enter to send
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSend(inputValue);
        setInputValue('');
      }
    }
  }, [inputValue, onSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    onTyping();
  }, [onTyping]);

  const dateGroups = useMemo(() => groupByDate(messages), [messages]);

  const activeTypers = useMemo(() =>
    typingUsers.filter(t =>
      String(t.conversationId) === String(conversationId) &&
      t.userId !== currentUserId
    ),
    [typingUsers, conversationId, currentUserId]
  );

  // No conversation selected
  if (!hasConversation) {
    return (
      <ThreadPanel $mobileHidden={mobileHidden}>
        <EmptyState>
          <EmptyIcon>
            <MessageSquare size={32} />
          </EmptyIcon>
          <EmptyTitle>Select a conversation</EmptyTitle>
          <EmptySubtext>Choose an existing conversation or start a new one</EmptySubtext>
        </EmptyState>
      </ThreadPanel>
    );
  }

  return (
    <ThreadPanel $mobileHidden={mobileHidden}>
      {/* Header with online status */}
      <ThreadHeader>
        <BackButton onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft size={20} />
        </BackButton>
        <AvatarWrap>
          <Avatar $size={36}>
            {participant?.photo ? (
              <img src={participant.photo} alt={participant ? `${participant.firstName} ${participant.lastName} profile` : ''} />
            ) : (
              getInitials(participant)
            )}
          </Avatar>
          <OnlineBadge $online={isParticipantOnline} />
        </AvatarWrap>
        <div>
          <ThreadUserName>
            {participant ? `${participant.firstName} ${participant.lastName}` : 'Loading...'}
          </ThreadUserName>
          <ThreadUserRole>
            {isParticipantOnline ? 'Online' : participant?.role || ''}
          </ThreadUserRole>
        </div>
        <ConnectionStatus $connected={connected}>
          <StatusDot $connected={connected} />
          {connected ? 'Live' : 'Polling'}
        </ConnectionStatus>
      </ThreadHeader>

      {/* Error banner */}
      {error && (
        <ErrorBanner
          $persistent={error.type === 'persistent'}
          onClick={onDismissError}
          role="alert"
        >
          <AlertTriangle size={14} />
          <span style={{ flex: 1 }}>{error.message}</span>
          <X size={14} />
        </ErrorBanner>
      )}

      {/* Messages */}
      <MessageArea ref={messageAreaRef}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1rem 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', maxWidth: '60%' }}>
                <SkeletonLine $width={`${120 + i * 40}px`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 && pendingMessages.length === 0 ? (
          <EmptyState>
            <EmptySubtext>No messages yet. Say hello!</EmptySubtext>
          </EmptyState>
        ) : (
          <>
            {dateGroups.map((group, gi) => (
              <React.Fragment key={gi}>
                <DateDivider>
                  <span>{formatDateLabel(group.date)}</span>
                </DateDivider>
                {group.messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  const isRead = isMine && msg.readBy && msg.readBy.length > 0;
                  return (
                    <MessageBubble key={msg.id} $isMine={isMine}>
                      <MessageText>{msg.content}</MessageText>
                      <MessageTime $isMine={isMine}>
                        {formatMessageTime(msg.created_at)}
                        {isMine && (
                          <span style={{ marginLeft: 4, display: 'inline-flex', verticalAlign: 'middle' }}>
                            {isRead
                              ? <CheckCheck size={12} style={{ color: '#60C0F0' }} />
                              : <Check size={12} />
                            }
                          </span>
                        )}
                      </MessageTime>
                    </MessageBubble>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Pending messages (optimistic UI) */}
            {pendingMessages.map((content, i) => (
              <PendingBubble key={`pending-${i}`}>
                <MessageText>{content}</MessageText>
                <MessageTime $isMine>
                  <Loader2 size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Sending...
                </MessageTime>
              </PendingBubble>
            ))}
          </>
        )}

        {/* Typing indicator */}
        {activeTypers.length > 0 && (
          <TypingIndicator>
            <TypingDots>
              <span /><span /><span />
            </TypingDots>
            <TypingText>
              {activeTypers.map(t => t.userName).join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...
            </TypingText>
          </TypingIndicator>
        )}

        <div ref={messageEndRef} />
      </MessageArea>

      {/* Compose — textarea for multiline, Enter to send, Shift+Enter for newline */}
      <ComposeBar onSubmit={handleSubmit}>
        <MessageTextArea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          aria-label="Message input"
          rows={1}
        />
        <SendButton
          type="submit"
          disabled={!inputValue.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </SendButton>
      </ComposeBar>
    </ThreadPanel>
  );
};

export default React.memo(MessageThread);
