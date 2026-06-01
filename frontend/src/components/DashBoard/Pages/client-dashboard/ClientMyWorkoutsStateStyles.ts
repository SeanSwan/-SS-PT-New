/**
 * ============================================================================
 * FILE: ClientMyWorkoutsStateStyles.ts
 * PURPOSE: Empty, error, and loading styles for the client workout diary page.
 * ============================================================================
 */

import styled from 'styled-components';

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  text-align: center;
`;

export const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const EmptyText = styled.p`
  font-size: 0.9rem;
  color: var(--text-muted, #94a3b8);
  max-width: 400px;
  margin: 0;
`;

export const ErrorCard = styled.div`
  padding: 2rem;
  text-align: center;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(201,42,84,0.3);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
`;

export const RetryBtn = styled.button`
  margin-top: 1rem;
  padding: 10px 24px;
  min-height: 44px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-weight: 600;
  &:hover { background: rgba(96,192,240,0.1); }
`;

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

export const ShimmerCard = styled.div`
  height: 100px;
  margin-bottom: 1rem;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.08) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  ${shimmer}
`;
