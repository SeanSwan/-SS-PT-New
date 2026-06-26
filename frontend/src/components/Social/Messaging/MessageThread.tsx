/**
 * FILE: MessageThread.tsx
 * PURPOSE: Message thread panel with direct and managed group-chat support.
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCheck, Check, AlertTriangle, X, Users } from 'lucide-react';
import type { ConversationData, GroupRole, MessageData, MessageParticipant, SearchUserResult, TypingUser } from './MessagingTypes';
import type { MessagingErrorState as ErrorState } from './messagingSafeErrors';
import { participantDisplayName } from './messagingApiAdapters';
import { getSafeMessagingErrorMessage } from './messagingSafeErrors';
import GroupManagementPanel from './GroupManagementPanel';
import { formatDateLabel, formatMessageTime, getInitials, groupByDate } from './MessageThread.logic';
import {
  ErrorMessageText,
  LoadingMessageList,
  LoadingMessageRow,
  PendingSpinnerIcon,
  ReadReceiptWrap,
} from './MessageThread.styles';
import {
  ThreadPanel, ThreadHeader, BackButton, Avatar, ThreadUserName,
  ThreadUserRole, MessageArea, MessageBubble, MessageText, MessageTime,
  DateDivider, ComposeBar, SendButton, EmptyState,
  EmptyIcon, EmptyTitle, EmptySubtext, SkeletonLine,
  AvatarWrap, OnlineBadge, TypingIndicator, TypingDots, TypingText,
  ConnectionStatus, StatusDot, ErrorBanner, MessageTextArea, PendingBubble,
} from './MessagingStyles';

interface Props {
  messages: MessageData[];
  currentUserId: number;
  participant: MessageParticipant | null;
  conversation: ConversationData | null;
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
  searchUsers: (query: string) => Promise<SearchUserResult[]>;
  onRenameConversation: (conversationId: string | number, name: string) => Promise<ConversationData | null>;
  onAddParticipants: (conversationId: string | number, participantIds: number[], adminIds?: number[]) => Promise<ConversationData | null>;
  onUpdateParticipantRole: (conversationId: string | number, userId: number, role: Exclude<GroupRole, 'owner'>) => Promise<ConversationData | null>;
  onRemoveParticipant: (conversationId: string | number, userId: number) => Promise<boolean>;
}

const MessageThread: React.FC<Props> = ({
  messages,
  currentUserId,
  participant,
  conversation,
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
  searchUsers,
  onRenameConversation,
  onAddParticipants,
  onUpdateParticipantRole,
  onRemoveParticipant,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMessages.length]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue('');
  }, [inputValue, onSend]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (inputValue.trim()) {
        onSend(inputValue);
        setInputValue('');
      }
    }
  }, [inputValue, onSend]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    onTyping();
  }, [onTyping]);

  const dateGroups = useMemo(() => groupByDate(messages), [messages]);
  const safeErrorMessage = useMemo(() => getSafeMessagingErrorMessage(error), [error]);
  const isGroupConversation = conversation?.type === 'group';
  const threadTitle = isGroupConversation
    ? (conversation?.name || 'Swan Family')
    : (participant ? participantDisplayName(participant) : 'Loading...');
  const threadSubtitle = isGroupConversation
    ? `${conversation?.memberCount || conversation?.participants.length || 0} members - you are ${conversation?.viewerRole || 'member'}`
    : (isParticipantOnline ? 'Online' : participant?.role || '');
  const activeTypers = useMemo(() => typingUsers.filter(t =>
    String(t.conversationId) === String(conversationId) && t.userId !== currentUserId
  ), [conversationId, currentUserId, typingUsers]);

  if (!hasConversation) {
    return (
      <ThreadPanel $mobileHidden={mobileHidden}>
        <EmptyState>
          <EmptyIcon><MessageSquare size={32} /></EmptyIcon>
          <EmptyTitle>Select a conversation</EmptyTitle>
          <EmptySubtext>Choose an existing conversation or start a new one</EmptySubtext>
        </EmptyState>
      </ThreadPanel>
    );
  }

  return (
    <ThreadPanel $mobileHidden={mobileHidden}>
      <ThreadHeader>
        <BackButton onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={20} /></BackButton>
        <AvatarWrap>
          <Avatar $size={36}>
            {isGroupConversation ? (
              <Users size={18} aria-hidden="true" />
            ) : participant?.photo ? (
              <img src={participant.photo} alt={participant ? `${participant.firstName} ${participant.lastName} profile` : ''} />
            ) : (
              getInitials(participant)
            )}
          </Avatar>
          {!isGroupConversation && <OnlineBadge $online={isParticipantOnline} />}
        </AvatarWrap>
        <div>
          <ThreadUserName>{threadTitle}</ThreadUserName>
          <ThreadUserRole>{threadSubtitle}</ThreadUserRole>
        </div>
        <ConnectionStatus $connected={connected}>
          <StatusDot $connected={connected} />
          {connected ? 'Live' : 'Polling'}
        </ConnectionStatus>
      </ThreadHeader>

      {error && (
        <ErrorBanner $persistent={error.type === 'persistent'} onClick={onDismissError} role="alert">
          <AlertTriangle size={14} />
          <ErrorMessageText>{safeErrorMessage}</ErrorMessageText>
          <X size={14} />
        </ErrorBanner>
      )}

      {isGroupConversation && conversation && (
        <GroupManagementPanel
          conversation={conversation}
          currentUserId={currentUserId}
          searchUsers={searchUsers}
          onRename={onRenameConversation}
          onAddParticipants={onAddParticipants}
          onUpdateParticipantRole={onUpdateParticipantRole}
          onRemoveParticipant={onRemoveParticipant}
        />
      )}

      <MessageArea ref={messageAreaRef}>
        {loading ? (
          <LoadingMessageList>
            {[1, 2, 3].map(i => <LoadingMessageRow key={i} $alignEnd={i % 2 === 0}><SkeletonLine $width={`${120 + i * 40}px`} /></LoadingMessageRow>)}
          </LoadingMessageList>
        ) : messages.length === 0 && pendingMessages.length === 0 ? (
          <EmptyState><EmptySubtext>No messages yet. Say hello!</EmptySubtext></EmptyState>
        ) : (
          <>
            {dateGroups.map((group, gi) => (
              <React.Fragment key={gi}>
                <DateDivider><span>{formatDateLabel(group.date)}</span></DateDivider>
                {group.messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  const isRead = isMine && msg.readBy && msg.readBy.length > 0;
                  return (
                    <MessageBubble key={msg.id} $isMine={isMine}>
                      <MessageText>{msg.content}</MessageText>
                      <MessageTime $isMine={isMine}>
                        {formatMessageTime(msg.created_at)}
                        {isMine && <ReadReceiptWrap $read={Boolean(isRead)}>{isRead ? <CheckCheck size={12} /> : <Check size={12} />}</ReadReceiptWrap>}
                      </MessageTime>
                    </MessageBubble>
                  );
                })}
              </React.Fragment>
            ))}
            {pendingMessages.map((content, i) => (
              <PendingBubble key={`pending-${i}`}>
                <MessageText>{content}</MessageText>
                <MessageTime $isMine><PendingSpinnerIcon size={10} /> Sending...</MessageTime>
              </PendingBubble>
            ))}
          </>
        )}

        {activeTypers.length > 0 && (
          <TypingIndicator>
            <TypingDots><span /><span /><span /></TypingDots>
            <TypingText>{activeTypers.map(t => t.userName).join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...</TypingText>
          </TypingIndicator>
        )}
        <div ref={messageEndRef} />
      </MessageArea>

      <ComposeBar onSubmit={handleSubmit}>
        <MessageTextArea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          aria-label="Message input"
          rows={1}
        />
        <SendButton type="submit" disabled={!inputValue.trim()} aria-label="Send message"><Send size={18} /></SendButton>
      </ComposeBar>
    </ThreadPanel>
  );
};

export default React.memo(MessageThread);
