/**
 * FILE: MessageThread.tsx
 * PURPOSE: Message thread panel with direct and managed group-chat support.
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCheck, Check, AlertTriangle, X, Users, RefreshCw, Paperclip } from 'lucide-react';
import type { ConversationData, GroupRole, MessageAttachmentDraft, MessageData, MessageParticipant, PendingMessage, SearchUserResult, SendMessageOptions, TypingUser } from './MessagingTypes';
import type { MessagingErrorState as ErrorState } from './messagingSafeErrors';
import { participantDisplayName } from './messagingApiAdapters';
import { getSafeMessagingErrorMessage } from './messagingSafeErrors';
import GroupManagementPanel from './GroupManagementPanel';
import GroupMessageBubble from './GroupMessageBubble';
import { ComposerContext, EditedBadge, MessageActionBar, MessageReplyPreview } from './MessageActionControls';
import MessageAttachmentList from './MessageAttachmentList';
import { ATTACHMENT_KIND_CONFIG, attachmentDraftLabel, isCardAttachmentKind } from './MessageThread.attachments';
import MessageThreadCoachIntelligence from './MessageThreadCoachIntelligence';
import { MessageReportPanel } from './MessageReportPanel';
import { ThreadGovernanceControls } from './MessageThreadGovernance';
import { formatDateLabel, formatMessageTime, getInitials, getMessageDeliveryStatus, groupByDate } from './MessageThread.logic';
import { AttachmentComposerButton, AttachmentDraftChip, AttachmentDraftTray, AttachmentErrorText, AttachmentInput, AttachmentPanel, AttachmentPanelFields, AttachmentRemoveButton, AttachmentSelect, ErrorMessageText, LoadingMessageList, LoadingMessageRow, PendingSpinnerIcon, PendingStatusRow, ReadReceiptWrap, RetrySendButton } from './MessageThread.styles';

const sameId = (a: string | number, b: string | number) => String(a) === String(b);
import {
  ThreadPanel, ThreadHeader, BackButton, Avatar, ThreadUserName, ThreadUserRole, MessageArea, MessageBubble,
  MessageText, MessageTime, DateDivider, ComposeBar, SendButton, EmptyState, EmptyIcon, EmptyTitle,
  EmptySubtext, SkeletonLine, AvatarWrap, OnlineBadge, TypingIndicator, TypingDots, TypingText,
  ConnectionStatus, StatusDot, ErrorBanner, ErrorDismissButton, MessageTextArea, PendingBubble,
} from './MessagingStyles';

interface Props {
  messages: MessageData[];
  currentUserId: string | number;
  participant: MessageParticipant | null;
  conversation: ConversationData | null;
  onSend: (content: string, options?: SendMessageOptions) => void | Promise<void>;
  onBack: () => void;
  onTyping: () => void;
  onDismissError: () => void;
  onRetryMessage?: (clientMessageId: string) => void;
  onEditMessage?: (messageId: string | number, content: string) => void | Promise<unknown>;
  onDeleteMessage?: (messageId: string | number) => void | Promise<unknown>;
  onToggleReaction?: (message: MessageData, reaction: string) => void | Promise<unknown>;
  onTogglePin?: (message: MessageData) => void | Promise<unknown>;
  onToggleSave?: (message: MessageData) => void | Promise<unknown>;
  onArchiveConversation?: (conversationId: string | number) => void | Promise<unknown>;
  onBlockUser?: (userId: number) => void | Promise<unknown>;
  onMarkUnread?: (conversationId: string | number) => void | Promise<unknown>;
  onMuteConversation?: (conversationId: string | number) => void | Promise<unknown>;
  onReportMessage?: (messageId: string | number, reason: string, details?: string) => void | Promise<unknown>;
  onSearchMessages?: (conversationId: string | number, query: string) => Promise<MessageData[]>;
  onUnmuteConversation?: (conversationId: string | number) => void | Promise<unknown>;
  loading: boolean;
  mobileHidden?: boolean;
  hasConversation: boolean;
  typingUsers: TypingUser[];
  isParticipantOnline: boolean;
  connected: boolean;
  conversationId: string | number | null;
  error: ErrorState | null;
  pendingMessages: PendingMessage[];
  searchUsers: (query: string) => Promise<SearchUserResult[]>;
  onRenameConversation: (conversationId: string | number, name: string) => Promise<ConversationData | null>;
  onAddParticipants: (conversationId: string | number, participantIds: number[], adminIds?: number[]) => Promise<ConversationData | null>;
  onUpdateParticipantRole: (conversationId: string | number, userId: number, role: Exclude<GroupRole, 'owner'>) => Promise<ConversationData | null>;
  onRemoveParticipant: (conversationId: string | number, userId: number) => Promise<boolean>;
}

const MessageThread: React.FC<Props> = ({
  messages, currentUserId, participant, conversation, onSend, onBack, onTyping, onDismissError, onRetryMessage,
  onEditMessage, onDeleteMessage, onToggleReaction, onTogglePin, onToggleSave, onArchiveConversation, onBlockUser, onMarkUnread,
  onMuteConversation, onReportMessage, onSearchMessages, onUnmuteConversation, loading, mobileHidden, hasConversation, typingUsers,
  isParticipantOnline, connected, conversationId, error, pendingMessages, searchUsers, onRenameConversation,
  onAddParticipants, onUpdateParticipantRole, onRemoveParticipant,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [replyTarget, setReplyTarget] = useState<MessageData | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageData | null>(null);
  const [reportTarget, setReportTarget] = useState<MessageData | null>(null);
  const [attachmentDrafts, setAttachmentDrafts] = useState<MessageAttachmentDraft[]>([]);
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentKind, setAttachmentKind] = useState<MessageAttachmentDraft['kind']>('link');
  const [attachmentEntityId, setAttachmentEntityId] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  const resetAttachmentComposer = useCallback(() => {
    setAttachmentDrafts([]);
    setShowAttachmentPanel(false);
    setAttachmentTitle('');
    setAttachmentUrl('');
    setAttachmentKind('link');
    setAttachmentEntityId('');
    setAttachmentError(null);
  }, []);

  useEffect(() => {
    resetAttachmentComposer();
  }, [conversationId, resetAttachmentComposer]);
  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container) return;
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 100) messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMessages.length]);

  const clearComposerContext = useCallback(() => {
    setReplyTarget(null);
    setEditingMessage(null);
    setInputValue('');
  }, []);

  const submitComposer = useCallback(() => {
    const next = inputValue.trim();
    if (!next && attachmentDrafts.length === 0) return;
    if (editingMessage && onEditMessage) {
      if (!next) return;
      void onEditMessage(editingMessage.id, next);
      resetAttachmentComposer();
      clearComposerContext();
      return;
    }
    const options: SendMessageOptions = {};
    if (replyTarget) options.replyToMessageId = replyTarget.id;
    if (attachmentDrafts.length > 0) options.attachments = attachmentDrafts;
    void onSend(next, Object.keys(options).length > 0 ? options : undefined);
    setReplyTarget(null);
    setAttachmentDrafts([]);
    setInputValue('');
  }, [attachmentDrafts, clearComposerContext, editingMessage, inputValue, onEditMessage, onSend, replyTarget, resetAttachmentComposer]);

  const handleSubmit = useCallback((event: React.FormEvent) => { event.preventDefault(); submitComposer(); }, [submitComposer]);
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitComposer(); }
  }, [submitComposer]);
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => { setInputValue(event.target.value); onTyping(); }, [onTyping]);
  const addAttachmentDraft = useCallback(() => {
    const title = attachmentTitle.trim().replace(/\s+/g, ' ');
    const url = attachmentUrl.trim();
    const kindConfig = ATTACHMENT_KIND_CONFIG[attachmentKind];
    if (!title || !url) { setAttachmentError('Attachment title and internal path are required.'); return; }
    if (!url.startsWith('/') || url.startsWith('//')) { setAttachmentError('Use an internal app path that starts with /.'); return; }
    if (attachmentDrafts.length >= 4) { setAttachmentError('Maximum 4 attachments per message.'); return; }
    let nextDraft: MessageAttachmentDraft = { kind: attachmentKind, title, url };
    if (isCardAttachmentKind(attachmentKind)) {
      const entityId = Number(attachmentEntityId);
      if (!Number.isInteger(entityId) || entityId <= 0) { setAttachmentError(`${kindConfig.label} card requires a numeric reference ID.`); return; }
      nextDraft = { kind: attachmentKind, title, url, entityType: kindConfig.entityType, entityId };
    }
    setAttachmentDrafts(prev => [...prev, nextDraft]);
    setAttachmentTitle('');
    setAttachmentUrl('');
    setAttachmentKind('link');
    setAttachmentEntityId('');
    setAttachmentError(null);
    setShowAttachmentPanel(false);
  }, [attachmentDrafts.length, attachmentEntityId, attachmentKind, attachmentTitle, attachmentUrl]);
  const removeAttachmentDraft = useCallback((index: number) => {
    setAttachmentDrafts(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);
  const startReply = useCallback((message: MessageData) => { setReplyTarget(message); setEditingMessage(null); }, []);
  const startEdit = useCallback((message: MessageData) => { resetAttachmentComposer(); setEditingMessage(message); setReplyTarget(null); setInputValue(message.content); }, [resetAttachmentComposer]);
  const deleteMessage = useCallback((message: MessageData) => { void onDeleteMessage?.(message.id); }, [onDeleteMessage]);
  const startReport = useCallback((message: MessageData) => { setReportTarget(message); }, []);
  const cancelReport = useCallback(() => { setReportTarget(null); }, []);
  const submitReport = useCallback((reason: string, details: string) => {
    if (!reportTarget || !onReportMessage) return;
    const messageId = reportTarget.id;
    setReportTarget(null);
    void onReportMessage(messageId, reason, details);
  }, [onReportMessage, reportTarget]);
  const toggleReaction = useCallback((message: MessageData, reaction: string) => { void onToggleReaction?.(message, reaction); }, [onToggleReaction]);
  const togglePin = useCallback((message: MessageData) => { void onTogglePin?.(message); }, [onTogglePin]);
  const toggleSave = useCallback((message: MessageData) => { void onToggleSave?.(message); }, [onToggleSave]);

  const dateGroups = useMemo(() => groupByDate(messages), [messages]);
  const messageById = useMemo(() => new Map(messages.map(message => [String(message.id), message])), [messages]);
  const safeErrorMessage = useMemo(() => getSafeMessagingErrorMessage(error), [error]);
  const isGroupConversation = conversation?.type === 'group';
  const participantById = useMemo(() => new Map((conversation?.participants || []).map(member => [Number(member.id), member])), [conversation?.participants]);
  const currentUserRole = participantById.get(Number(currentUserId))?.role || null;
  const directBlockParticipant = !isGroupConversation ? participant : null;
  const directBlockLabel = directBlockParticipant ? participantDisplayName(directBlockParticipant) : 'participant';
  const threadTitle = isGroupConversation ? (conversation?.name || 'Swan Family') : (participant ? participantDisplayName(participant) : 'Loading...');
  const threadSubtitle = isGroupConversation ? `${conversation?.memberCount || conversation?.participants.length || 0} members - you are ${conversation?.viewerRole || 'member'}` : (isParticipantOnline ? 'Online' : participant?.role || '');
  const activeTypers = useMemo(() => typingUsers.filter(t => String(t.conversationId) === String(conversationId) && !sameId(t.userId, currentUserId)), [conversationId, currentUserId, typingUsers]);
  const composerLabel = isGroupConversation ? `Message ${threadTitle}` : 'Message input';
  const composerPlaceholder = editingMessage ? 'Edit message...' : replyTarget ? 'Write a reply...' : isGroupConversation ? `Message ${threadTitle}...` : 'Type a message...';
  const attachmentKindConfig = ATTACHMENT_KIND_CONFIG[attachmentKind];
  const showAttachmentEntityField = isCardAttachmentKind(attachmentKind);
  const composerContextLabel = useMemo(() => {
    if (!replyTarget) return threadTitle;
    const sender = replyTarget.sender || participantById.get(Number(replyTarget.sender_id)) || null;
    return sender ? participantDisplayName(sender) : threadTitle;
  }, [participantById, replyTarget, threadTitle]);

  const replyMeta = useCallback((message: MessageData) => {
    const reply = message.reply_to_message_id ? messageById.get(String(message.reply_to_message_id)) : null;
    const sender = reply?.sender || (reply ? participantById.get(Number(reply.sender_id)) : null) || null;
    return reply ? { label: sender ? participantDisplayName(sender) : 'Message', content: reply.content } : { label: null, content: null };
  }, [messageById, participantById]);
  const hasViewerReaction = useCallback((message: MessageData) => Boolean(message.reactions?.some(row => sameId(row.userId, currentUserId) && row.reaction === 'swan')), [currentUserId]);
  const isViewerPinned = useCallback((message: MessageData) => Boolean(message.pins?.some(row => sameId(row.pinnedBy, currentUserId))), [currentUserId]);
  const isViewerSaved = useCallback((message: MessageData) => Boolean(message.saves?.some(row => sameId(row.savedBy, currentUserId))), [currentUserId]);

  if (!hasConversation) {
    return <ThreadPanel $mobileHidden={mobileHidden}><EmptyState><EmptyIcon><MessageSquare size={32} /></EmptyIcon><EmptyTitle>Select a conversation</EmptyTitle><EmptySubtext>Choose an existing conversation or start a new one</EmptySubtext></EmptyState></ThreadPanel>;
  }

  return (
    <ThreadPanel $mobileHidden={mobileHidden}>
      <ThreadHeader>
        <BackButton onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={20} /></BackButton>
        <AvatarWrap>
          <Avatar $size={36}>{isGroupConversation ? <Users size={18} aria-hidden="true" /> : participant?.photo ? <img src={participant.photo} alt={participant ? `${participant.firstName} ${participant.lastName} profile` : ''} /> : getInitials(participant)}</Avatar>
          {!isGroupConversation && <OnlineBadge $online={isParticipantOnline} />}
        </AvatarWrap>
        <div><ThreadUserName>{threadTitle}</ThreadUserName><ThreadUserRole>{threadSubtitle}</ThreadUserRole></div>
        <ConnectionStatus $connected={connected}><StatusDot $connected={connected} />{connected ? 'Live' : 'Polling'}</ConnectionStatus>
      </ThreadHeader>

      <ThreadGovernanceControls
        conversationId={conversationId}
        isMuted={Boolean(conversation?.isMuted)}
        blockUserId={directBlockParticipant?.id ?? null}
        blockUserLabel={directBlockLabel}
        onArchiveConversation={onArchiveConversation}
        onBlockUser={onBlockUser}
        onMarkUnread={onMarkUnread}
        onMuteConversation={onMuteConversation}
        onSearchMessages={onSearchMessages}
        onUnmuteConversation={onUnmuteConversation}
      />

      <MessageThreadCoachIntelligence
        messages={messages}
        currentUserId={currentUserId}
        conversationId={conversationId}
        currentUserRole={currentUserRole}
        participantLabel={threadTitle}
        onUseSuggestedReply={setInputValue}
      />

      {error && (
        <ErrorBanner $persistent={error.type === 'persistent'} role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <ErrorMessageText>{safeErrorMessage}</ErrorMessageText>
          <ErrorDismissButton type="button" onClick={onDismissError} aria-label="Dismiss error">
            <X size={14} aria-hidden="true" />
          </ErrorDismissButton>
        </ErrorBanner>
      )}
      {isGroupConversation && conversation && <GroupManagementPanel conversation={conversation} currentUserId={currentUserId} searchUsers={searchUsers} onRename={onRenameConversation} onAddParticipants={onAddParticipants} onUpdateParticipantRole={onUpdateParticipantRole} onRemoveParticipant={onRemoveParticipant} />}

      <MessageArea ref={messageAreaRef}>
        {loading ? <LoadingMessageList>{[1, 2, 3].map(i => <LoadingMessageRow key={i} $alignEnd={i % 2 === 0}><SkeletonLine $width={`${120 + i * 40}px`} /></LoadingMessageRow>)}</LoadingMessageList> : messages.length === 0 && pendingMessages.length === 0 ? <EmptyState><EmptySubtext>No messages yet. Say hello!</EmptySubtext></EmptyState> : (
          <>
            {dateGroups.map((group, gi) => <React.Fragment key={gi}><DateDivider><span>{formatDateLabel(group.date)}</span></DateDivider>{group.messages.map(msg => {
              const isMine = sameId(msg.sender_id, currentUserId);
              const isRead = isMine && msg.readBy && msg.readBy.length > 0;
              const deliveryStatus = getMessageDeliveryStatus(msg, isMine);
              const sender = msg.sender || participantById.get(Number(msg.sender_id)) || null;
              const reply = replyMeta(msg);
              if (isGroupConversation) return <GroupMessageBubble key={msg.id} message={msg} sender={sender} currentUserId={currentUserId} isRead={Boolean(isRead)} timeLabel={formatMessageTime(msg.created_at)} replyLabel={reply.label} replyContent={reply.content} reactionActive={hasViewerReaction(msg)} pinned={isViewerPinned(msg)} saved={isViewerSaved(msg)} onReply={startReply} onEdit={startEdit} onDelete={deleteMessage} onReport={startReport} onToggleReaction={toggleReaction} onTogglePin={togglePin} onToggleSave={toggleSave} />;
              return <MessageBubble key={msg.id} $isMine={isMine}>{reply.label && reply.content && <MessageReplyPreview label={reply.label} content={reply.content} />}<MessageText>{msg.content}</MessageText><MessageAttachmentList attachments={msg.attachments} /><MessageTime $isMine={isMine}>{formatMessageTime(msg.created_at)}{msg.edited_at && !msg.deleted_at && <EditedBadge>Edited</EditedBadge>}{isMine && <ReadReceiptWrap $read={Boolean(isRead)}>{isRead ? <CheckCheck size={12} /> : <Check size={12} />}</ReadReceiptWrap>}{deliveryStatus && <span> {deliveryStatus}</span>}</MessageTime><MessageActionBar message={msg} canEdit={isMine} canDelete={isMine} reactionActive={hasViewerReaction(msg)} pinned={isViewerPinned(msg)} saved={isViewerSaved(msg)} onReply={startReply} onEdit={startEdit} onDelete={deleteMessage} onReport={!isMine ? startReport : undefined} onToggleReaction={toggleReaction} onTogglePin={togglePin} onToggleSave={toggleSave} /></MessageBubble>;
            })}</React.Fragment>)}
            {pendingMessages.map(pending => <PendingBubble key={pending.clientMessageId}><MessageText>{pending.content}</MessageText><PendingStatusRow><MessageTime $isMine>{pending.status === 'failed' ? <><AlertTriangle size={10} /> Not sent</> : <><PendingSpinnerIcon size={10} /> Sending...</>}</MessageTime>{pending.status === 'failed' && onRetryMessage && <RetrySendButton type="button" onClick={() => onRetryMessage(pending.clientMessageId)} aria-label={`Retry message: ${pending.content}`}><RefreshCw size={14} /> Retry</RetrySendButton>}</PendingStatusRow></PendingBubble>)}
          </>
        )}
        {activeTypers.length > 0 && <TypingIndicator><TypingDots><span /><span /><span /></TypingDots><TypingText>{activeTypers.map(t => t.userName).join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...</TypingText></TypingIndicator>}
        <div ref={messageEndRef} />
      </MessageArea>

      {reportTarget && <MessageReportPanel message={reportTarget} onCancel={cancelReport} onSubmit={submitReport} />}
      {(replyTarget || editingMessage) && <ComposerContext mode={editingMessage ? 'edit' : 'reply'} label={composerContextLabel} content={(editingMessage || replyTarget)?.content || ''} onClear={clearComposerContext} />}
      {!editingMessage && attachmentDrafts.length > 0 && (
        <AttachmentDraftTray>
          {attachmentDrafts.map((attachment, index) => {
            const label = attachmentDraftLabel(attachment);
            return <AttachmentDraftChip key={`${attachment.kind}-${attachment.title}-${attachment.url}`}>{label}<AttachmentRemoveButton type="button" aria-label={`Remove attachment ${label}`} onClick={() => removeAttachmentDraft(index)}><X size={12} /></AttachmentRemoveButton></AttachmentDraftChip>;
          })}
        </AttachmentDraftTray>
      )}
      {!editingMessage && showAttachmentPanel && (
        <AttachmentPanel>
          <AttachmentPanelFields $hasEntity={showAttachmentEntityField}>
            <AttachmentSelect value={attachmentKind} onChange={(event) => { setAttachmentKind(event.target.value as MessageAttachmentDraft['kind']); setAttachmentEntityId(''); setAttachmentError(null); }} aria-label="Attachment type">
              {Object.entries(ATTACHMENT_KIND_CONFIG).map(([kind, config]) => <option key={kind} value={kind}>{config.label}</option>)}
            </AttachmentSelect>
            <AttachmentInput value={attachmentTitle} onChange={(event) => setAttachmentTitle(event.target.value)} aria-label="Attachment title" placeholder="Attachment title" />
            <AttachmentInput value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} aria-label="Internal app path" placeholder="/dashboard/client/progress" />
            {showAttachmentEntityField && <AttachmentInput value={attachmentEntityId} onChange={(event) => setAttachmentEntityId(event.target.value)} aria-label={attachmentKindConfig.entityIdLabel || 'Attachment reference ID'} placeholder={attachmentKindConfig.entityIdLabel || 'Reference ID'} inputMode="numeric" />}
            <AttachmentComposerButton type="button" onClick={addAttachmentDraft} aria-label={attachmentKindConfig.buttonLabel}>Attach</AttachmentComposerButton>
          </AttachmentPanelFields>
          {attachmentError && <AttachmentErrorText role="alert">{attachmentError}</AttachmentErrorText>}
        </AttachmentPanel>
      )}
      <ComposeBar onSubmit={handleSubmit}>
        {!editingMessage && <AttachmentComposerButton type="button" onClick={() => setShowAttachmentPanel(current => !current)} aria-label="Add internal attachment"><Paperclip size={18} /></AttachmentComposerButton>}
        <MessageTextArea value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={composerPlaceholder} aria-label={composerLabel} rows={1} />
        <SendButton type="submit" disabled={!inputValue.trim() && attachmentDrafts.length === 0} aria-label="Send message"><Send size={18} /></SendButton>
      </ComposeBar>
    </ThreadPanel>
  );
};

export default React.memo(MessageThread);
