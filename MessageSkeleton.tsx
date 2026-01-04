import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SkeletonContainer = styled.div<{ $isCurrentUser: boolean }>`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: ${props => (props.$isCurrentUser ? 'flex-end' : 'flex-start')};
  align-items: flex-end;
  width: 100%;
`;

const SkeletonAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`;

const SkeletonBubble = styled.div`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
`;

const SkeletonLine = styled.div`
  height: 1em;
  border-radius: 4px;
  background: linear-gradient(to right, rgba(255,255,255,0.05) 8%, rgba(255,255,255,0.1) 18%, rgba(255,255,255,0.05) 33%);
  background-size: 1200px 100%;
  animation: ${shimmer} 2s infinite;
`;

const MessageSkeleton: React.FC<{ isCurrentUser?: boolean }> = ({ isCurrentUser = false }) => {
  return (
    <SkeletonContainer $isCurrentUser={isCurrentUser}>
      {!isCurrentUser && <SkeletonAvatar />}
      <SkeletonBubble>
        <SkeletonLine style={{ width: isCurrentUser ? '120px' : '80px', marginBottom: '8px' }} />
        <SkeletonLine style={{ width: isCurrentUser ? '180px' : '150px' }} />
      </SkeletonBubble>
    </SkeletonContainer>
  );
};

export default MessageSkeleton;