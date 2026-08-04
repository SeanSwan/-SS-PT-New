/**
 * FoodScannerPage.styles.ts
 * =========================
 * Crystalline Swan styles for the Food Ingredient Scanner page.
 * Phase 4E (2026-08-04): extracted from FoodScannerPage.tsx (741 lines of
 * mixed concerns) and fully tokenized — every color rides
 * var(--token, #fallback) with Crystalline Swan fallbacks. The page
 * previously carried 51 raw off-brand literals (HY3 UX-crime #5).
 *
 * Rating chips reuse the tone helpers from the sibling FoodScanner
 * component library so scanner + analysis stay on one rating language.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { toneColor, toneSurface } from '../../components/FoodScanner/ProductAnalysis.styles';

// ── Rating tone helpers ─────────────────────────────────────────────────────

const NEUTRAL_TEXT = 'var(--text-muted, rgba(224, 236, 244, 0.55))';
const NEUTRAL_SURFACE = 'var(--surface-muted, rgba(224, 236, 244, 0.08))';

const ratingText = (rating: string) =>
  rating === 'good' || rating === 'bad' || rating === 'okay' ? toneColor(rating) : NEUTRAL_TEXT;

const ratingSurface = (rating: string) =>
  rating === 'good' || rating === 'bad' || rating === 'okay' ? toneSurface(rating) : NEUTRAL_SURFACE;

// ── Page scaffold ───────────────────────────────────────────────────────────

export const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-secondary, #002060), var(--surface-dark, #1A1A24));
  color: var(--text-primary, #E0ECF4);
  padding: 1rem 1rem 6rem;

  @media (max-width: 414px) {
    padding: 0.75rem 0.75rem 5rem;
  }
`;

export const Header = styled.div`
  text-align: center;
  padding: 1rem 0 2rem;

  @media (max-width: 414px) {
    padding: 0.5rem 0 1.25rem;
  }
`;

export const Title = styled(motion.h1)`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 300;
  background: linear-gradient(
    to right,
    var(--ice-wing, #60C0F0),
    var(--arctic-cyan, #50A0F0),
    var(--wing-purple, #8B5CF6),
    var(--swan-lavender, #4070C0)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (max-width: 414px) {
    font-size: 1.7rem;
  }
`;

export const Subtitle = styled.p`
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

export const ContentContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

export const ScanResultsContainer = styled(motion.div)`
  width: 100%;
`;

// ── Instructions ────────────────────────────────────────────────────────────

export const InstructionsCard = styled(motion.div)`
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
  text-align: center;

  @media (max-width: 414px) {
    padding: 1.25rem;
  }
`;

export const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  text-align: left;
`;

export const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

export const StepNumber = styled.div`
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--ice-wing, #60C0F0));
  color: var(--text-primary, #E0ECF4);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
`;

export const StepContent = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  font-size: 0.95rem;
`;

// ── Search ──────────────────────────────────────────────────────────────────

export const SearchContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
`;

export const SearchInput = styled.input`
  flex: 1;
  min-height: 44px;
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
  border-radius: 8px 0 0 8px;
  padding: 0.8rem 1rem;
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

export const SearchButton = styled.button`
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--ice-wing, #60C0F0));
  color: var(--text-primary, #E0ECF4);
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 0 1.5rem;
  min-height: 44px;
  min-width: 44px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  /* Dual-glow discipline: purple-led control glows cyan on hover/focus. */
  &:hover,
  &:focus-visible {
    box-shadow: 0 0 16px var(--glow-cyan, rgba(96, 192, 240, 0.5));
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

// ── Tabs ────────────────────────────────────────────────────────────────────

export const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
`;

export const TabButton = styled.button<{ $active: boolean }>`
  background: transparent;
  color: ${({ $active }) => $active
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  border: none;
  padding: 0.8rem 1.5rem;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? 'var(--ice-wing, #60C0F0)' : 'transparent'};
  transition: color 0.3s ease, border-color 0.3s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @media (max-width: 414px) {
    flex: 1;
    padding: 0.8rem 0.5rem;
  }
`;

// ── Loading / error / empty states ──────────────────────────────────────────

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

export const LoadingSpinner = styled(motion.div)`
  width: 50px;
  height: 50px;
  border: 3px solid var(--border-subtle, rgba(224, 236, 244, 0.25));
  border-radius: 50%;
  border-top-color: var(--ice-wing, #60C0F0);
  margin-bottom: 1rem;
`;

export const LoadingText = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 0.9rem;
`;

export const ErrorMessage = styled.div`
  background: var(--error-surface, rgba(201, 42, 84, 0.1));
  border: 1px solid var(--error-border, rgba(201, 42, 84, 0.25));
  color: var(--text-primary, #E0ECF4);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
`;

export const NoResultsMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-style: italic;
`;

// ── Scan history ────────────────────────────────────────────────────────────

export const ScanHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ScanHistoryItem = styled.div`
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px var(--shadow-soft, rgba(10, 10, 15, 0.35));
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  @media (max-width: 414px) {
    padding: 0.75rem;
    gap: 0.75rem;
  }
`;

export const ScanHistoryImage = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
`;

export const ScanHistoryContent = styled.div`
  flex: 1;
`;

export const ScanHistoryName = styled.div`
  font-weight: 500;
  margin-bottom: 0.2rem;
`;

export const ScanHistoryDetails = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
`;

export const ScanHistoryRating = styled.div<{ rating: string }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: ${({ rating }) => ratingSurface(rating)};
  color: ${({ rating }) => ratingText(rating)};
  border: 1px solid ${({ rating }) => ratingText(rating)};
`;

export const FavoriteStar = styled.div`
  color: var(--gilded-fern, #C6A84B);
  font-size: 1.2rem;
`;

// ── Inline action buttons (formerly raw $style objects) ─────────────────────

export const SecondaryActionButton = styled.button`
  background: var(--surface-dark, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.2));
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  min-height: 44px;
  min-width: 44px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const PrimaryActionButton = styled.button`
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--ice-wing, #60C0F0));
  color: var(--text-primary, #E0ECF4);
  border: none;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  min-height: 44px;
  min-width: 44px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover,
  &:focus-visible {
    box-shadow: 0 0 16px var(--glow-cyan, rgba(96, 192, 240, 0.5));
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;
