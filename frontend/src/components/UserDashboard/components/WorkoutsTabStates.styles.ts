/**
 * Loading and empty-state styles for the active UserDashboard V3 workout panel.
 */

import styled from 'styled-components';

export const ShimmerCard = styled.div`
  height: 72px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(20, 20, 25, 0.6) 0%,
    rgba(80, 160, 240, 0.08) 50%,
    rgba(20, 20, 25, 0.6) 100%
  );
  background-size: 200px 100%;
  animation: shimmerAnim 1.5s ease-in-out infinite;

  @keyframes shimmerAnim {
    0% {
      background-position: -200px 0;
    }

    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
`;

export const EmptyState = styled.div`
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
`;

export const EmptyIconShell = styled.div`
  opacity: 0.3;
  color: var(--accent-primary, #60C0F0);
`;

export const EmptyTitle = styled.h4`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
`;

export const EmptyText = styled.p`
  max-width: 360px;
  margin: 0;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.875rem;
  line-height: 1.6;
`;
