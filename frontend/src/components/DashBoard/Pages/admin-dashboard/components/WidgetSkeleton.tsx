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
  background: var(--skeleton-base, color-mix(in srgb, var(--bg-elevated, #141419) 86%, var(--accent-primary, #60C0F0) 14%));
  background-image: linear-gradient(
    to right,
    var(--skeleton-base, color-mix(in srgb, var(--bg-elevated, #141419) 86%, var(--accent-primary, #60C0F0) 14%)) 0%,
    var(--skeleton-highlight, color-mix(in srgb, var(--bg-elevated, #141419) 72%, var(--accent-secondary, #8B5CF6) 28%)) 20%,
    var(--skeleton-base, color-mix(in srgb, var(--bg-elevated, #141419) 86%, var(--accent-primary, #60C0F0) 14%)) 40%,
    var(--skeleton-base, color-mix(in srgb, var(--bg-elevated, #141419) 86%, var(--accent-primary, #60C0F0) 14%)) 100%
  );
  background-repeat: no-repeat;
  background-size: 2000px 104px;
  display: inline-block;
  position: relative;
  animation: ${shimmer} 2s linear infinite;
  border-radius: 8px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: auto;
  }
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
  border-bottom: 1px solid var(--border-primary-faint, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
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
