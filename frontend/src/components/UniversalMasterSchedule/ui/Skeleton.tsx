/**
 * Skeleton Loading Components
 * ===========================
 * P1-14: Loading skeleton components for improved perceived performance
 *
 * Usage:
 * - Skeleton: Base skeleton element (line, circle, rectangle)
 * - SkeletonCard: Card-shaped skeleton for session cards
 * - SkeletonGrid: Grid of skeleton cards
 */

import styled, { keyframes, css } from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

// Shimmer animation for skeleton loading effect
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Reduced motion: Disable animation
const shimmerStyles = css`
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: rgba(255, 255, 255, 0.05);
  }
`;

// Base skeleton element
export const Skeleton = styled.div<{
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  $marginBottom?: string;
}>`
  ${shimmerStyles}
  border-radius: ${props => {
    switch (props.variant) {
      case 'circular':
        return '50%';
      case 'text':
        return '4px';
      default:
        return '8px';
    }
  }};
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '1rem'};
  margin-bottom: ${props => props.$marginBottom || '0'};
`;

// Session card skeleton
export const SkeletonCard = styled.div`
  ${shimmerStyles}
  border-radius: 12px;
  border: 1px solid ${galaxySwanTheme.borders.subtle};
  padding: 0.75rem;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 768px) {
    min-height: 70px;
    padding: 0.625rem;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    padding: 0.5rem;
    border-radius: 8px;
  }
`;

// Inner skeleton elements for card content
const SkeletonCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const SkeletonLine = styled.div<{ width?: string }>`
  ${shimmerStyles}
  height: 0.75rem;
  border-radius: 4px;
  width: ${props => props.width || '100%'};
`;

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SkeletonDot = styled.div`
  ${shimmerStyles}
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`;

// Complete session card skeleton component
export const SessionCardSkeleton: React.FC = () => (
  <SkeletonCard>
    <SkeletonHeader>
      <SkeletonDot />
      <SkeletonLine width="60px" />
      <SkeletonLine width="40px" style={{ marginLeft: 'auto' }} />
    </SkeletonHeader>
    <SkeletonCardContent>
      <SkeletonLine width="80%" />
      <SkeletonLine width="60%" />
      <SkeletonLine width="50%" />
    </SkeletonCardContent>
  </SkeletonCard>
);

// Grid container for multiple skeleton cards
export const SkeletonGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

// Row skeleton (for time slots)
export const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
  align-items: stretch;

  @media (max-width: 1024px) {
    grid-template-columns: 70px repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 60px repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 50px repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.35rem;
  }
`;

// Time cell skeleton
export const SkeletonTimeCell = styled.div`
  ${shimmerStyles}
  padding: 0.75rem 0.5rem;
  border-radius: 10px;
  height: 40px;

  @media (max-width: 768px) {
    padding: 0.5rem 0.375rem;
    border-radius: 8px;
    height: 36px;
  }
`;

// Slot cell skeleton
export const SkeletonSlotCell = styled.div`
  ${shimmerStyles}
  min-height: 80px;
  border-radius: 12px;
  border: 1px dashed ${galaxySwanTheme.borders.subtle};

  @media (max-width: 768px) {
    min-height: 70px;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    border-radius: 8px;
  }
`;

// Day view skeleton component
interface DayViewSkeletonProps {
  rows?: number;
  columns?: number;
}

export const DayViewSkeleton: React.FC<DayViewSkeletonProps> = ({
  rows = 6,
  columns = 3
}) => (
  <SkeletonGrid>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <SkeletonRow key={rowIndex}>
        <SkeletonTimeCell />
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonSlotCell key={colIndex} />
        ))}
      </SkeletonRow>
    ))}
  </SkeletonGrid>
);

// Month view day cell skeleton
export const SkeletonDayCell = styled.div`
  ${shimmerStyles}
  aspect-ratio: 1;
  min-height: 100px;
  border-radius: 12px;
  border: 1px solid ${galaxySwanTheme.borders.subtle};

  @media (max-width: 768px) {
    min-height: 80px;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    border-radius: 8px;
  }
`;

// Month view skeleton
interface MonthViewSkeletonProps {
  weeks?: number;
}

export const MonthViewSkeleton: React.FC<MonthViewSkeletonProps> = ({
  weeks = 5
}) => (
  <MonthSkeletonGrid>
    {Array.from({ length: 7 }).map((_, dayIndex) => (
      <SkeletonLine key={`header-${dayIndex}`} width="40px" style={{ margin: '0 auto' }} />
    ))}
    {Array.from({ length: weeks * 7 }).map((_, cellIndex) => (
      <SkeletonDayCell key={cellIndex} />
    ))}
  </MonthSkeletonGrid>
);

const MonthSkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;

  @media (max-width: 768px) {
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    gap: 0.25rem;
  }
`;

// Agenda view skeleton
export const AgendaSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <AgendaSkeletonContainer>
    {Array.from({ length: items }).map((_, index) => (
      <AgendaSkeletonItem key={index}>
        <SkeletonLine width="80px" />
        <SkeletonCardContent>
          <SkeletonLine width="70%" />
          <SkeletonLine width="50%" />
        </SkeletonCardContent>
        <SkeletonLine width="60px" />
      </AgendaSkeletonItem>
    ))}
  </AgendaSkeletonContainer>
);

const AgendaSkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const AgendaSkeletonItem = styled.div`
  ${shimmerStyles}
  display: grid;
  grid-template-columns: 90px 1fr 100px;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid ${galaxySwanTheme.borders.subtle};
  min-height: 60px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 12px;
  }
`;

// React import for FC types
import React from 'react';

export default Skeleton;
