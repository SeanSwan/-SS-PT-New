import React from 'react';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

interface MessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: number;
    sender: {
      id: number;
      name: string;
      photo?: string;
    };
    readBy?: {
      userId: number;
      userName: string;
    }[];
  };
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const { user } = useAuth();
  const isCurrentUser = user?.id === message.sender_id;
  const readByOtherUsers = message.readBy?.filter(r => r.userId !== user?.id) || [];
  const readByTooltip = readByOtherUsers.length > 0 ? `Read by ${readByOtherUsers.map(r => r.userName).join(', ')}` : '';

  return (
    <MessageContainer $isCurrentUser={isCurrentUser}>
      {!isCurrentUser && (
        <Avatar src={message.sender.photo} alt={message.sender.name} />
      )}
      <MessageBubble $isCurrentUser={isCurrentUser}>
        {!isCurrentUser && <SenderName>{message.sender.name}</SenderName>}
        <Content>{message.content}</Content>
        <Footer>
          <Timestamp>
            {formatDistanceToNowStrict(new Date(message.created_at), { addSuffix: true })}
          </Timestamp>
          {isCurrentUser && (
            <TooltipContainer title={readByTooltip}>
              {readByOtherUsers.length > 0 ? <CheckCheck size={16} color="var(--primary-cyan)" /> : <Check size={16} />}
            </TooltipContainer>
          )}
        </Footer>
      </MessageBubble>
    </MessageContainer>
  );
};

const MessageContainer = styled.div<{ $isCurrentUser: boolean }>`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: ${props => (props.$isCurrentUser ? 'flex-end' : 'flex-start')};
  align-items: flex-end;
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
`;

const MessageBubble = styled.div<{ $isCurrentUser: boolean }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 20px;
  background: ${props =>
    props.$isCurrentUser
      ? 'var(--primary-cyan, #00CED1)'
      : 'var(--glass-bg, rgba(255, 255, 255, 0.1))'};
  color: ${props => (props.$isCurrentUser ? 'var(--dark-bg, #0a0e1a)' : 'var(--text-primary, #FFFFFF)')};
  border-top-left-radius: ${props => (props.$isCurrentUser ? '20px' : '4px')};
  border-top-right-radius: ${props => (props.$isCurrentUser ? '4px' : '20px')};
`;

const SenderName = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--primary-cyan, #00CED1);
`;

const Content = styled.p`
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

const Timestamp = styled.div`
  font-size: 10px;
  opacity: 0.7;
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover > span {
    visibility: visible;
    opacity: 1;
  }
`;

const TooltipText = styled.span`
  visibility: hidden;
  width: max-content;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 10px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
  }
`;

export default Message;