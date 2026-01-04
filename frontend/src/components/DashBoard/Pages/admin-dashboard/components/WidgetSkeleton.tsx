import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const SkeletonBase = styled.div`
  background: #2a2a3a;
  background-image: linear-gradient(to right, #2a2a3a 0%, #3a3a4a 20%, #2a2a3a 40%, #2a2a3a 100%);
  background-repeat: no-repeat;
  background-size: 2000px 104px;
  display: inline-block;
  position: relative;
  animation: ${shimmer} 2s linear infinite;
  border-radius: 8px;
`;

const SkeletonCircle = styled(SkeletonBase)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const SkeletonLine = styled(SkeletonBase)`
  height: 16px;
  margin-bottom: 8px;
  border-radius: 4px;

  &.short {
    width: 60%;
  }
  &.long {
    width: 100%;
  }
`;

const SkeletonItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
`;

const WidgetSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index}>
          <SkeletonCircle />
          <div style={{ flex: 1 }}>
            <SkeletonLine className="long" />
            <SkeletonLine className="short" />
          </div>
          <SkeletonBase style={{ width: '50px', height: '24px' }} />
        </SkeletonItem>
      ))}
    </div>
  );
};

export default WidgetSkeleton;