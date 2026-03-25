/**
 * ============================================================================
 * FILE: ClientCommunityStyles.ts
 * PURPOSE: Styled components for ClientCommunityPage — extracted per 300-line rule
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
`;

// Energy Conversion button: blue bg → purple glow on hover
export const PostBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #002060);
  cursor: pointer;
  background: var(--accent-primary, #002060);
  color: #FFFFFF;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    background: var(--bg-elevated, #003080);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const PostBox = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

export const PostInput = styled.textarea`
  flex: 1;
  min-height: 56px;
  padding: 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  resize: vertical;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--accent-primary, #60C0F0),
                0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, #64748b);
  }
`;

export const HashtagHint = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

export const SectionCard = styled.div`
  background: var(--bg-surface, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1.25rem;

  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Challenges
// ─────────────────────────────────────────────────────────────
export const ChallengeCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.15));
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  &:last-child { margin-bottom: 0; }
`;

export const ChallengeTitle = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
`;

export const ChallengeDesc = styled.div`
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 0.625rem;
`;

export const ChallengeFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
`;

export const ProgressBarOuter = styled.div`
  flex: 1;
  max-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
  margin-right: 0.5rem;
`;

export const ProgressBarInner = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 3px;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: var(--accent-secondary, #8B5CF6);
  transition: width 0.4s;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Leaderboard
// ─────────────────────────────────────────────────────────────
export const LeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
`;

// AI Village Phase 3: Luxury metal RankBadge tokens
export const RankBadge = styled.div<{ $rank: number }>`
  ${({ $rank }) => {
    const colors: Record<number, { bg: string; border: string; text: string; shadow: string }> = {
      1: { bg: '#141419', border: '#C6A84B', text: '#FCECAE', shadow: 'rgba(198, 168, 75, 0.3)' },
      2: { bg: '#141419', border: '#64748B', text: '#E0ECF4', shadow: 'rgba(224, 236, 244, 0.2)' },
      3: { bg: '#141419', border: '#92400E', text: '#FDBA74', shadow: 'rgba(146, 64, 14, 0.4)' },
    };
    const color = colors[$rank] || { bg: '#141419', border: '#4070C0', text: '#E0ECF4', shadow: 'transparent' };
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

// ─────────────────────────────────────────────────────────────
// SECTION: Feed & States
// ─────────────────────────────────────────────────────────────
export const FeedPost = styled.div`
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
  .post-author { font-weight: 600; font-size: 0.875rem; }
  .post-body { font-size: 0.8125rem; color: var(--text-secondary, #94a3b8); margin-top: 0.25rem; }
  .post-time { font-size: 0.6875rem; color: var(--text-muted, #64748b); margin-top: 0.25rem; }
`;

export const EmptyState = styled.p`
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem 0;
`;

export const ShimmerBlock = styled.div`
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.06) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

export const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-left: 4px solid #C92A54;
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
`;
