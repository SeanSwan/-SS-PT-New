/**
 * ============================================================================
 * FILE: ExploreStyles.ts
 * PURPOSE: Styled components for Social Explore tab
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes } from 'styled-components';

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

export const ExploreContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

export const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const SeeAllLink = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
  background: none;
  border: none;
  cursor: pointer;
  min-height: 44px;
  padding: 0 8px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.8; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Trending Posts Grid
// ─────────────────────────────────────────────────────────────

export const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const PostCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: var(--accent-primary, rgba(96, 192, 240, 0.2));
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`;

export const PostAuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
`;

export const PostAvatar = styled.div<{ $src?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $src }) => $src ? `url(${$src}) center/cover` : 'var(--accent-secondary, #8B5CF6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--bg-base, #030712);
`;

export const PostAuthorName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const PostTypeBadge = styled.span`
  margin-left: auto;
  font-size: 0.6rem;
  font-family: 'Fira Code', monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
`;

export const PostContent = styled.p`
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
`;

export const PostMedia = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 0.75rem;
`;

export const PostStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

export const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Discover People
// ─────────────────────────────────────────────────────────────

export const PeopleScroll = styled.div`
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--border-soft, rgba(96, 192, 240, 0.12)) transparent;

  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--border-soft, rgba(96, 192, 240, 0.12)); border-radius: 2px; }
`;

export const PersonCard = styled.div`
  flex: 0 0 160px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: var(--accent-secondary, rgba(139, 92, 246, 0.25));
    transform: translateY(-2px);
  }
`;

export const PersonAvatar = styled.div<{ $src?: string }>`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${({ $src }) => $src ? `url(${$src}) center/cover` : 'var(--accent-secondary, #8B5CF6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: var(--bg-base, #030712);
  border: 2px solid var(--border-soft, rgba(96, 192, 240, 0.12));
`;

export const PersonName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

export const PersonMeta = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.625rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

export const FollowButton = styled.button`
  min-height: 44px;
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid var(--accent-secondary, rgba(139, 92, 246, 0.3));
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  width: 100%;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:active { transform: scale(0.97); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Challenges
// ─────────────────────────────────────────────────────────────

export const ChallengesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const ChallengeCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: var(--accent-gold, rgba(198, 168, 75, 0.25));
    transform: translateY(-2px);
  }
`;

export const ChallengeTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.375rem;
`;

export const ChallengeDesc = styled.p`
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`;

export const ChallengeMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

export const XpBadge = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-weight: 600;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Skeleton Loaders
// ─────────────────────────────────────────────────────────────

export const SkeletonBlock = styled.div<{ $w?: string; $h?: string; $r?: string }>`
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '16px'};
  border-radius: ${({ $r }) => $r || '6px'};
  background: linear-gradient(90deg,
    rgba(96, 192, 240, 0.04) 0%,
    rgba(96, 192, 240, 0.08) 50%,
    rgba(96, 192, 240, 0.04) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.8s ease-in-out infinite;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
`;
