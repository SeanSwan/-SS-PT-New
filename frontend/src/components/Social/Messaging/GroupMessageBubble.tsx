/**
 * FILE: GroupMessageBubble.tsx
 * PURPOSE: Group-chat message bubble with visible speaker identity and role context.
 */
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { GroupRole, MessageData, MessageParticipant } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import { getInitials } from './MessageThread.logic';
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
  currentUserId: number;
  isRead: boolean;
  timeLabel: string;
}

const normalizeGroupRole = (role: MessageParticipant['groupRole']): GroupRole => {
  if (role === 'owner' || role === 'admin' || role === 'member') return role;
  return 'member';
};

const roleLabel = (role: GroupRole): string => role.charAt(0).toUpperCase() + role.slice(1);

const GroupMessageBubble: React.FC<GroupMessageBubbleProps> = ({
  message,
  sender,
  currentUserId,
  isRead,
  timeLabel,
}) => {
  const isMine = message.sender_id === currentUserId;
  const displayName = isMine ? 'You' : (sender ? participantDisplayName(sender) : 'Unknown member');
  const groupRole = normalizeGroupRole(sender?.groupRole);

  return (
    <GroupMessageBubbleRow $isMine={isMine}>
      <GroupMessageAvatar $isMine={isMine} aria-hidden="true">
        {sender?.photo ? <img src={sender.photo} alt="" /> : getInitials(sender)}
      </GroupMessageAvatar>

      <GroupMessageContent $isMine={isMine}>
        <GroupSpeakerLine $isMine={isMine}>
          <GroupSpeakerName data-testid={`group-message-speaker-${message.sender_id}`}>
            {displayName}
          </GroupSpeakerName>
          <GroupRoleBadge $role={groupRole} data-testid={`group-message-role-${message.sender_id}`}>
            {roleLabel(groupRole)}
          </GroupRoleBadge>
        </GroupSpeakerLine>

        <GroupBubbleCard $isMine={isMine}>
          <MessageText>{message.content}</MessageText>
          <GroupMessageMeta $isMine={isMine}>
            {timeLabel}
            {isMine && (
              <ReadReceiptWrap $read={Boolean(isRead)}>
                {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
              </ReadReceiptWrap>
            )}
          </GroupMessageMeta>
        </GroupBubbleCard>
      </GroupMessageContent>
    </GroupMessageBubbleRow>
  );
};

export default React.memo(GroupMessageBubble);
