import React from 'react';
import styled from 'styled-components';

interface MessageProps {
  message: {
    id: string;
    content: string;
    sender_id?: number;
    senderId?: number;
    sender?: { id: number; name: string; photo?: string };
    senderName?: string;
    created_at?: string;
    createdAt?: string;
    readBy?: Array<{ userId: number; userName: string }>;
  };
  isOwnMessage?: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isOwnMessage }) => {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const timestamp = message.createdAt || message.created_at;
  const senderName = message.senderName || message.sender?.name || '';

  return (
    <MessageContainer $isOwn={!!isOwnMessage}>
      <MessageBubble $isOwn={!!isOwnMessage}>
        {!isOwnMessage && senderName && <SenderName>{senderName}</SenderName>}
        <MessageContent>{message.content}</MessageContent>
        <MessageFooter>
          <Timestamp>{formatTime(timestamp)}</Timestamp>
          {isOwnMessage && message.readBy && message.readBy.length > 0 && (
            <ReadIndicator>✓✓</ReadIndicator>
          )}
        </MessageFooter>
      </MessageBubble>
    </MessageContainer>
  );
};

export default Message;

const MessageContainer = styled.div<{ $isOwn: boolean }>`
  display: flex;
  justify-content: ${props => props.$isOwn ? 'flex-end' : 'flex-start'};
  margin-bottom: 12px;
  padding: 0 16px;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 70%;
  background: ${props => props.$isOwn
    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 16px;
  padding: 12px 16px;
  ${props => props.$isOwn
    ? 'border-bottom-right-radius: 4px;'
    : 'border-bottom-left-radius: 4px;'}
`;

const SenderName = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const MessageContent = styled.p`
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
`;

const MessageFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  gap: 8px;
`;

const Timestamp = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
`;

const ReadIndicator = styled.span`
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 600;
`;
