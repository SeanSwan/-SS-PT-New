/**
 * FILE: MessageThread.tsx
 * PURPOSE: Message thread panel with direct and managed group-chat support.
 */
import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCheck, Check, AlertTriangle, X, Users } from 'lucide-react';
import type { ConversationData, GroupRole, MessageData, MessageParticipant, SearchUserResult, TypingUser } from './MessagingTypes';
import type { MessagingErrorState as ErrorState } from './messagingSafeErrors';
import { participantDisplayName } from './messagingApiAdapters';
import { getSafeMessagingErrorMessage, MESSAGING_ERROR_MESSAGES } from './messagingSafeErrors';
import GroupManagementPanel from './GroupManagementPanel';
import GroupMessageBubble from './GroupMessageBubble';
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
  onSend: (content: string) => Promise<boolean>;
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
  const [isSending, setIsSending] = useState(false);
  const inputValueRef = useRef('');
  const sendingRef = useRef(false);
  const composerKey = `${currentUserId}:${String(conversationId)}`;
  const composerScopeRef = useRef({ key: composerKey, generation: 0 });
  if (composerScopeRef.current.key !== composerKey) {
    composerScopeRef.current = { key: composerKey, generation: composerScopeRef.current.generation + 1 };
  }
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    inputValueRef.current = '';
    sendingRef.current = false;
    setInputValue('');
    setIsSending(false);
  }, [composerKey]);
  useEffect(() => () => { composerScopeRef.current.generation += 1; }, []);

  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMessages.length]);

  const submitMessage = useCallback(async () => {
    const submittedText = inputValue;
    if (!submittedText.trim() || sendingRef.current) return;
    const submittedGeneration = composerScopeRef.current.generation;
    sendingRef.current = true;
    setIsSending(true);
    try {
      const sent = await onSend(submittedText);
      if (sent && composerScopeRef.current.generation === submittedGeneration && inputValueRef.current === submittedText) {
        inputValueRef.current = '';
        setInputValue('');
      }
    } finally {
      if (composerScopeRef.current.generation === submittedGeneration) {
        sendingRef.current = false;
        setIsSending(false);
      }
    }
  }, [inputValue, onSend]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    void submitMessage();
  }, [submitMessage]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }, [submitMessage]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    inputValueRef.current = event.target.value;
    setInputValue(event.target.value);
    onTyping();
  }, [onTyping]);

  const dateGroups = useMemo(() => groupByDate(messages), [messages]);
  const safeErrorMessage = useMemo(() => error?.type === 'persistent' && error.message === MESSAGING_ERROR_MESSAGES.send
    ? 'Message delivery could not be confirmed. Your draft is kept. Check the conversation before trying again.'
    : getSafeMessagingErrorMessage(error), [error]);
  const isGroupConversation = conversation?.type === 'group';
  const participantById = useMemo(() => new Map(
    (conversation?.participants || []).map(member => [Number(member.id), member])
  ), [conversation?.participants]);
  const threadTitle = isGroupConversation
    ? (conversation?.name || 'Swan Family')
    : (participant ? participantDisplayName(participant) : 'Loading...');
  const threadSubtitle = isGroupConversation
    ? `${conversation?.memberCount || conversation?.participants.length || 0} members - you are ${conversation?.viewerRole || 'member'}`
    : (isParticipantOnline ? 'Online' : participant?.role || '');
  const activeTypers = useMemo(() => typingUsers.filter(t =>
    String(t.conversationId) === String(conversationId) && t.userId !== currentUserId
  ), [conversationId, currentUserId, typingUsers]);
  const composerLabel = isGroupConversation ? `Message ${threadTitle}` : 'Message input';
  const composerPlaceholder = isGroupConversation ? `Message ${threadTitle}...` : 'Type a message...';

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
                  const sender = msg.sender || participantById.get(Number(msg.sender_id)) || null;
                  if (isGroupConversation) {
                    return (
                      <GroupMessageBubble
                        key={msg.id}
                        message={msg}
                        sender={sender}
                        currentUserId={currentUserId}
                        isRead={Boolean(isRead)}
                        timeLabel={formatMessageTime(msg.created_at)}
                      />
                    );
                  }
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
          placeholder={composerPlaceholder}
          aria-label={composerLabel}
          rows={1}
        />
        <SendButton type="submit" disabled={!inputValue.trim() || isSending} aria-label="Send message"><Send size={18} /></SendButton>
      </ComposeBar>
    </ThreadPanel>
  );
};

export default React.memo(MessageThread);
