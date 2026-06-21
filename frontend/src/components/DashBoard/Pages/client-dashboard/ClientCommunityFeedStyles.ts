/**
 * Feed, leaderboard, and state styles for the mounted client Community page.
 */

import styled, { css, keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const LeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent));

  &:last-child {
    border-bottom: none;
  }
`;

export const LeaderName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
`;

export const LeaderPoints = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

export const RankBadge = styled.div<{ $rank: number }>`
  ${({ $rank }) => {
    const colors: Record<number, { bg: string; border: string; text: string; shadow: string }> = {
      1: {
        bg: 'var(--bg-elevated, #141419)',
        border: 'var(--accent-luxury, #C6A84B)',
        text: 'var(--rank-gold-text, #FCECAE)',
        shadow: 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 30%, transparent)',
      },
      2: {
        bg: 'var(--bg-elevated, #141419)',
        border: 'var(--border-strong, #64748B)',
        text: 'var(--text-primary, #E0ECF4)',
        shadow: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent)',
      },
      3: {
        bg: 'var(--bg-elevated, #141419)',
        border: 'var(--accent-copper, #92400E)',
        text: 'var(--rank-bronze-text, #FDBA74)',
        shadow: 'color-mix(in srgb, var(--accent-copper, #92400E) 35%, transparent)',
      },
    };
    const color = colors[$rank] || {
      bg: 'var(--bg-elevated, #141419)',
      border: 'var(--accent-tertiary, #4070C0)',
      text: 'var(--text-primary, #E0ECF4)',
      shadow: 'transparent',
    };
    return css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 6px;
      color: ${color.text};
      box-shadow: inset 0 0 8px ${color.shadow};
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
      font-weight: 700;
    `;
  }}
`;

export const FeedPost = styled.div`
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent));

  &:last-child {
    border-bottom: none;
  }

  .post-author {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .post-body {
    font-size: 0.8125rem;
    color: var(--text-secondary, #94a3b8);
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
  }

  .post-time {
    font-size: 0.6875rem;
    color: var(--text-muted, #94a3b8);
    margin-top: 0.25rem;
  }
`;

export const EmptyState = styled.p`
  color: var(--text-muted, #94a3b8);
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem 0;
`;

export const ShimmerBlock = styled.div<{ $height?: string; $bottom?: string }>`
  height: ${({ $height }) => $height || '80px'};
  margin-bottom: ${({ $bottom }) => $bottom || 0};
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    var(--bg-elevated, #141419) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-left: 4px solid var(--error-accent, #C92A54);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
`;

export const PointsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 0.6875rem;
  color: var(--accent-secondary, #8B5CF6);
  font-weight: 600;
  white-space: nowrap;
`;
