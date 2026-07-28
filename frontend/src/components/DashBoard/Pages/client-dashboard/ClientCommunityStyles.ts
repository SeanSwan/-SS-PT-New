/**
 * ============================================================================
 * FILE: ClientCommunityStyles.ts
 * PURPOSE: Primary styled components for ClientCommunityPage
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 */

import styled from 'styled-components';

export {
  EmptyState,
  ErrorBox,
  FeedPost,
  LeaderName,
  LeaderPoints,
  LeaderRow,
  PointsChip,
  RankBadge,
  ShimmerBlock,
} from './ClientCommunityFeedStyles';

export const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

export const PostBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #002060);
  cursor: pointer;
  background: var(--accent-primary, #002060);
  color: var(--text-heading, #FFFFFF);
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    opacity 0.2s ease,
    transform 0.25s ease;

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

  @media (max-width: 640px) {
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

export const PostBox = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const PostInput = styled.textarea`
  flex: 1;
  width: 100%;
  min-height: 56px;
  padding: 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
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
    color: var(--text-muted, #94a3b8);
  }
`;

export const PostContentArea = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
`;

export const HashtagHint = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

export const CharacterCounter = styled.span<{ $danger?: boolean }>`
  margin-left: auto;
  color: ${({ $danger }) => ($danger ? 'var(--error-accent, #C92A54)' : 'inherit')};
`;

export const CompactErrorBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-left: 4px solid var(--error-accent, #C92A54);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  margin-top: 8px;
  padding: 0.5rem;
`;

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const SectionCard = styled.div`
  background: var(--bg-surface, #0A0A0F);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: 12px;
  padding: 1.25rem;
  min-width: 0;

  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

export const ChallengeCard = styled.button`
  width: 100%;
  min-height: 44px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent));
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 0 1px var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent));
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  &:last-child {
    margin-bottom: 0;
  }
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
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
`;

export const ChallengeProgressInline = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
`;

export const ChallengeTime = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
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
  transition: width 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
