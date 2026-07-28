/**
 * FILE: GroupMessageBubble.tsx
 * PURPOSE: Group-chat message bubble with visible speaker identity and role context.
 */
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { GroupRole, MessageData, MessageParticipant } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import { getInitials, getMessageDeliveryStatus } from './MessageThread.logic';
import { EditedBadge, MessageActionBar, MessageReplyPreview } from './MessageActionControls';
import MessageAttachmentList from './MessageAttachmentList';
import { ReadReceiptWrap } from './MessageThread.styles';
import { MessageText } from './MessagingStyles';
import {
  GroupBubbleCard,
  GroupMessageAvatar,
  GroupMessageBubbleRow,
  GroupMessageContent,
  GroupMessageMeta,
  GroupRoleBadge,
  GroupSpeakerLine,
  GroupSpeakerName,
} from './GroupMessageBubble.styles';

interface GroupMessageBubbleProps {
  message: MessageData;
  sender: MessageParticipant | null;
  currentUserId: string | number;
  isRead: boolean;
  timeLabel: string;
  replyLabel?: string | null;
  replyContent?: string | null;
  reactionActive?: boolean;
  pinned?: boolean;
  saved?: boolean;
  onReply?: (message: MessageData) => void;
  onEdit?: (message: MessageData) => void;
  onDelete?: (message: MessageData) => void;
  onReport?: (message: MessageData) => void;
  onToggleReaction?: (message: MessageData, reaction: string) => void;
  onTogglePin?: (message: MessageData) => void;
  onToggleSave?: (message: MessageData) => void;
}

const normalizeGroupRole = (role: MessageParticipant['groupRole']): GroupRole => {
  if (role === 'owner' || role === 'admin' || role === 'member') return role;
  return 'member';
};

const roleLabel = (role: GroupRole): string => role.charAt(0).toUpperCase() + role.slice(1);
const sameId = (a: string | number, b: string | number) => String(a) === String(b);

const GroupMessageBubble: React.FC<GroupMessageBubbleProps> = ({
  message,
  sender,
  currentUserId,
  isRead,
  timeLabel,
  replyLabel,
  replyContent,
  reactionActive = false,
  pinned = false,
  saved = false,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onToggleReaction,
  onTogglePin,
  onToggleSave,
}) => {
  const isMine = sameId(message.sender_id, currentUserId);
  const displayName = isMine ? 'You' : (sender ? participantDisplayName(sender) : 'Unknown member');
  const groupRole = normalizeGroupRole(sender?.groupRole);
  const deliveryStatus = getMessageDeliveryStatus(message, isMine);
  const canAct = !message.deleted_at;

  return (
    <GroupMessageBubbleRow $isMine={isMine}>
      <GroupMessageAvatar $isMine={isMine} aria-hidden="true">
        {sender?.photo ? <img src={sender.photo} alt="" /> : getInitials(sender)}
      </GroupMessageAvatar>

      <GroupMessageContent $isMine={isMine}>
        <GroupSpeakerLine $isMine={isMine}>
          <GroupSpeakerName data-testid={`group-message-speaker-${message.sender_id}`}>{displayName}</GroupSpeakerName>
          <GroupRoleBadge $role={groupRole} data-testid={`group-message-role-${message.sender_id}`}>{roleLabel(groupRole)}</GroupRoleBadge>
        </GroupSpeakerLine>

        <GroupBubbleCard $isMine={isMine}>
          {replyLabel && replyContent && <MessageReplyPreview label={replyLabel} content={replyContent} />}
          <MessageText>{message.content}</MessageText>
          <MessageAttachmentList attachments={message.attachments} />
          <GroupMessageMeta $isMine={isMine}>
            {timeLabel}
            {message.edited_at && !message.deleted_at && <EditedBadge>Edited</EditedBadge>}
            {isMine && <ReadReceiptWrap $read={Boolean(isRead)}>{isRead ? <CheckCheck size={12} /> : <Check size={12} />}</ReadReceiptWrap>}
            {deliveryStatus && <span> {deliveryStatus}</span>}
          </GroupMessageMeta>
          {canAct && (
            <MessageActionBar
              message={message}
              canEdit={isMine}
              canDelete={isMine}
              reactionActive={reactionActive}
              pinned={pinned}
              saved={saved}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={!isMine ? onReport : undefined}
              onToggleReaction={onToggleReaction}
              onTogglePin={onTogglePin}
              onToggleSave={onToggleSave}
            />
          )}
        </GroupBubbleCard>
      </GroupMessageContent>
    </GroupMessageBubbleRow>
  );
};

export default React.memo(GroupMessageBubble);
