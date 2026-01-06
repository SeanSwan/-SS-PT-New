import React from 'react';
import styled, { keyframes } from 'styled-components';

const MessageSkeleton: React.FC = () => {
  return (
    <SkeletonContainer>
      <SkeletonBubble>
        <SkeletonLine width="60%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="40%" />
      </SkeletonBubble>
    </SkeletonContainer>
  );
};

export default MessageSkeleton;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
  padding: 0 16px;
`;

const SkeletonBubble = styled.div`
  max-width: 70%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px 16px;
  border-bottom-left-radius: 4px;
`;

const SkeletonLine = styled.div<{ width: string }>`
  width: ${props => props.width};
  height: 14px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;
