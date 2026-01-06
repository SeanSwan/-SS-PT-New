import React from 'react';
import styled from 'styled-components';

interface ChatHeaderProps {
  conversationId: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversationId }) => {
  return (
    <HeaderContainer>
      <HeaderTitle>Conversation</HeaderTitle>
    </HeaderContainer>
  );
};

export default ChatHeader;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.h2`
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;
