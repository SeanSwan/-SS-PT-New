/**
 * Feed and empty-state styles for the UserDashboard V3 activity section.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import { visionControlCss } from './UserDashboardSectionChrome.styles';

export const ActivityContent = styled.div`
  min-width: 0;
  margin-left: 60px;
`;

export const ActivityItemHeader = styled.div`
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

export const ActivityItemTitle = styled.h4`
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  word-break: break-word;
`;

export const ActivityTime = styled.p`
  margin: 0;
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  white-space: nowrap;

  @media (max-width: 768px) {
    white-space: normal;
  }
`;

export const ActivityDescription = styled.p`
  margin: 0 0 0.75rem;
  overflow-wrap: anywhere;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
`;

export const ActivityMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--text-muted, #64748b);
  font-size: 0.8rem;
`;

export const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const MetaLabel = styled.span`
  font-weight: 500;
`;

export const ShowMoreButton = styled(motion.button)`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  ${visionControlCss}
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
`;

export const EmptyState = styled.div`
  padding: 3rem 2rem;
  color: var(--text-muted, #64748b);
  text-align: center;
`;

export const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--bg-surface, var(--bg-elevated, rgba(0, 48, 128, 0.85)));
  color: var(--text-muted, #64748b);
`;

export const EmptyTitle = styled.h3`
  margin: 0 0 0.5rem;
  color: inherit;
`;

export const EmptyCopy = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: var(--text-muted, #64748b);

  svg {
    animation: activity-spin 1s linear infinite;
  }

  @keyframes activity-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`;

export const LoadingText = styled.p`
  margin: 1rem 0 0;
`;
