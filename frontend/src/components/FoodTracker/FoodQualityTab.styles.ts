/**
 * FoodQualityTab.styles.ts
 * ========================
 * Crystalline Swan styles for the Food Quality tab (Phase 4E resurrection
 * of the dormant ingredient-safety intelligence). Token-bound, 44px
 * interactive minimums, prefers-reduced-motion guards on the shimmer.
 */

import styled, { keyframes, css } from 'styled-components';
import { toneColor, toneSurface } from '../FoodScanner/ProductAnalysis.styles';

const ratingChipText = (rating?: string | null) =>
  rating === 'good' || rating === 'bad' || rating === 'okay'
    ? toneColor(rating)
    : 'var(--text-muted, rgba(224, 236, 244, 0.55))';

const ratingChipSurface = (rating?: string | null) =>
  rating === 'good' || rating === 'bad' || rating === 'okay'
    ? toneSurface(rating)
    : 'var(--surface-muted, rgba(224, 236, 244, 0.08))';

export const TabShell = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const IntroCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.88rem;
  line-height: 1.5;
`;

export const SearchRow = styled.form`
  display: flex;
  gap: 0;
`;

export const SearchField = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 0.7rem 1rem;
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
  border-radius: 8px 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.4));
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: var(--wing-purple, #8B5CF6);
    box-shadow: 0 0 0 3px var(--focus-ring, rgba(139, 92, 246, 0.3));
  }
`;

export const SearchSubmit = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 0 8px 8px 0;
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--ice-wing, #60C0F0));
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    box-shadow: 0 0 16px var(--glow-cyan, rgba(96, 192, 240, 0.5));
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const ResultRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
  border-radius: 10px;
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--ice-wing, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ResultName = styled.span`
  font-size: 0.88rem;
  font-weight: 600;
`;

export const ResultBrand = styled.span`
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const RatingChip = styled.span<{ $rating?: string | null }>`
  flex-shrink: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ $rating }) => ratingChipText($rating)};
  background: ${({ $rating }) => ratingChipSurface($rating)};
  border: 1px solid ${({ $rating }) => ratingChipText($rating)};
`;

export const SelectedCard = styled.div`
  padding: 1rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
  border-radius: 12px;
  background: var(--card-dark, #141419);
`;

export const SelectedHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const SelectedTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary, #E0ECF4);
`;

export const BackButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.9rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.2));
  border-radius: 8px;
  background: var(--surface-dark, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const StateCard = styled.div`
  padding: 1.5rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
  border-radius: 12px;
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 0.88rem;
  line-height: 1.55;
`;

export const RetryButton = styled.button`
  margin-top: 0.75rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 8px;
  background: var(--royal-depth, #003080);
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

const shimmer = keyframes`
  0% { opacity: 0.35; }
  50% { opacity: 0.75; }
  100% { opacity: 0.35; }
`;

export const SkeletonBlock = styled.div`
  height: 44px;
  border-radius: 10px;
  background: var(--skeleton-surface, rgba(96, 192, 240, 0.08));
  ${css`animation: ${shimmer} 1.4s ease-in-out infinite;`}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: var(--skeleton-surface-static, rgba(96, 192, 240, 0.12));
  }
`;

export const GateNote = styled.p`
  margin: 0.75rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.08));
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 0.78rem;
  line-height: 1.5;
`;
