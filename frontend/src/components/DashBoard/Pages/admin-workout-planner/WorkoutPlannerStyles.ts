/**
 * ============================================================================
 * FILE: WorkoutPlannerStyles.ts
 * PURPOSE: Styled components for the NASM Workout Planner page
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
export const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const Page = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 4px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Controls Row
// ─────────────────────────────────────────────────────────────
export const ControlRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

export const Select = styled.select`
  background: var(--bg-surface, #003080);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }

  option {
    background: var(--bg-base, #030712);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'cosmic' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  color: var(--text-primary, #E0ECF4);

  background: ${({ $variant }) =>
    $variant === 'cosmic'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%)'
      : 'var(--bg-surface, #002060)'};
  box-shadow: ${({ $variant }) =>
    $variant === 'cosmic'
      ? '0 4px 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
      : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ $variant }) =>
      $variant === 'cosmic'
        ? '0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)'
        : '0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'};
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Status Banner
// ─────────────────────────────────────────────────────────────
export const StatusBanner = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  background: ${({ $type }) => $type === 'error'
    ? 'rgba(26, 26, 36, 0.95)'
    : 'rgba(26, 26, 36, 0.95)'};
  border-left: 4px solid ${({ $type }) => $type === 'error' ? 'var(--danger, #C92A54)' : 'var(--accent-gold, #C6A84B)'};
  color: var(--text-primary, #E0ECF4);

  button {
    background: none;
    border: none;
    color: var(--text-secondary, #94a3b8);
    font-size: 1.2rem;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: var(--text-primary, #E0ECF4); }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Degraded Intelligence Banner
// PURPOSE: Gilded Fern-bordered warning when pain/injury data unavailable
// WHY: AI Village Phase 3 consensus — trainer must review before assigning
// ─────────────────────────────────────────────────────────────
export const DegradedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: rgba(26, 26, 36, 0.95);
  border: 1px solid var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    color: var(--accent-gold, #C6A84B);
  }

  strong {
    color: var(--accent-gold, #C6A84B);
    font-weight: 700;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Three-Panel Layout
// ─────────────────────────────────────────────────────────────
export const ThreePanel = styled.div<{ $teachModeOpen?: boolean }>`
  display: grid;
  gap: 16px;
  grid-template-columns: ${({ $teachModeOpen }) =>
    $teachModeOpen ? 'minmax(280px, 360px) 1fr minmax(280px, 360px)' : 'minmax(280px, 360px) 1fr'};
  transition: grid-template-columns 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);

  @media (max-width: 1279px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 430px) {
    gap: 10px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Panel / Card
// ─────────────────────────────────────────────────────────────
export const Panel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const PanelHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-radius: 3px;
  }

  @media (max-width: 430px) {
    max-height: 320px;
    flex: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Search Input
// ─────────────────────────────────────────────────────────────
export const SearchWrapper = styled.div`
  position: relative;
  margin-bottom: 12px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted, rgba(224, 236, 244, 0.5));
    pointer-events: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  padding: 0.6rem 1rem 0.6rem 36px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.5)); }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Chips
// ─────────────────────────────────────────────────────────────
export const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;

  @media (max-width: 430px) {
    gap: 4px;
    margin-bottom: 8px;
  }
`;

export const Chip = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent) 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 36px;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  ${({ $active }) => $active ? 'box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);' : ''}

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    padding: 5px 10px;
    font-size: 0.65rem;
    min-height: 32px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise List Item
// ─────────────────────────────────────────────────────────────
export const ExerciseAddBtn = styled.button`
  all: unset;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    transform: scale(1.1);
  }

  @media (min-width: 431px) {
    display: none;
  }
`;

export const ExerciseItem = styled.div<{ $selected?: boolean }>`
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)' : 'var(--border-soft, rgba(96, 192, 240, 0.06))'};
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)' : 'rgba(255, 255, 255, 0.015)'};
  color: inherit;
  font: inherit;
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-height: 44px;
  overflow: hidden;
  border-left: 3px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    transform: translateX(2px);
  }

  &:active { transform: translateX(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    padding: 8px 10px;
  }
`;

export const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 430px) {
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;

export const ExerciseMeta = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  display: flex;
  gap: 0;
  align-items: center;
  flex-wrap: wrap;
  overflow: hidden;

  /* Pipe separators and tag spans */
  & > span {
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

export const MetaTag = styled.span<{ $impact?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  background: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    if ($impact === 'Medium Impact') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)';
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';
  }};
  color: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'var(--accent-primary, #60C0F0)';
    if ($impact === 'Medium Impact') return 'var(--accent-gold, #C6A84B)';
    if ($impact === 'High Impact') return 'var(--danger, #C92A54)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.55))';
  }};
  border: 1px solid ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
    if ($impact === 'Medium Impact') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)';
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
  }};
  margin: 2px 3px 2px 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Builder Exercise Row
// ─────────────────────────────────────────────────────────────
export const BuilderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  margin-bottom: 8px;
  background: var(--bg-base, #030712);
  transition: border-color 0.2s ease;

  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }

  @media (max-width: 430px) {
    flex-wrap: wrap;
    padding: 8px 10px;
    gap: 6px;
  }
`;

export const BuilderRowNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  min-width: 24px;
`;

export const BuilderRowInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const MiniInput = styled.input`
  width: 56px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  text-align: center;
  min-height: 44px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const RemoveBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, var(--danger, #C92A54) 15%, transparent);
  color: var(--danger, #E14B67);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s ease;

  &:hover { background: color-mix(in srgb, var(--danger, #C92A54) 30%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: OPT Phase Badge
// ─────────────────────────────────────────────────────────────
export const PhaseBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  margin-bottom: 16px;
`;

export const PhaseLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
`;

export const PhaseParams = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Skeleton / Empty
// ─────────────────────────────────────────────────────────────
export const SkeletonBlock = styled.div`
  height: 56px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.05) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2.5s infinite linear;
`;

export const EmptyMessage = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: AI Generation Skeleton
// PURPOSE: Frost shimmer skeleton for the builder panel during workout generation
// WHY: AI Village CRITICAL — 8 parallel queries = latency, needs perceived perf
// ─────────────────────────────────────────────────────────────
export const GeneratingSkeletonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
`;

export const GeneratingSkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-base, #030712);
  border: 1px solid rgba(96, 192, 240, 0.06);
`;

export const SkeletonCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.08) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2s infinite linear;
  flex-shrink: 0;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const SkeletonBar = styled.div<{ $width?: string }>`
  height: 12px;
  width: ${({ $width }) => $width || '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.06) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2s infinite linear;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const GeneratingLabel = styled.div`
  text-align: center;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 0.95rem;
  color: var(--accent-primary, #60C0F0);
  padding: 8px 0 4px;
  opacity: 0.8;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Explanations Panel
// PURPOSE: Display AI reasoning, pain exclusions, safety warnings to trainer
// WHY: AI Village HIGH — builds trust, helps trainer understand generated workout
// ─────────────────────────────────────────────────────────────
export const ExplanationsPanel = styled.div`
  margin-top: 20px;
  border-top: 1px solid rgba(96, 192, 240, 0.08);
  padding-top: 16px;
`;

export const ExplanationsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  min-height: 44px;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

export const ExplanationItem = styled.div<{ $type?: string }>`
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  margin-top: 8px;
  border-radius: 8px;
  background: var(--bg-base, #030712);
  border-left: 3px solid ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'var(--danger, #C92A54)';
      case 'pain_exclusion': return 'var(--accent-gold, #C6A84B)';
      case 'pain_warning': return 'var(--warning, #D4AF37)';
      case 'compensation': return 'var(--accent-secondary, #8B5CF6)';
      default: return 'var(--accent-primary, #60C0F0)';
    }
  }};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

export const ExplanationBadge = styled.span<{ $type?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'color-mix(in srgb, var(--danger, #C92A54) 15%, transparent)';
      case 'pain_exclusion': return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)';
      case 'pain_warning': return 'color-mix(in srgb, var(--warning, #D4AF37) 15%, transparent)';
      case 'compensation': return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)';
      default: return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'var(--danger, #E14B67)';
      case 'pain_exclusion': return 'var(--accent-gold, #C6A84B)';
      case 'pain_warning': return 'var(--warning, #D4AF37)';
      case 'compensation': return 'var(--accent-secondary, #8B5CF6)';
      default: return 'var(--accent-primary, #60C0F0)';
    }
  }};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Teach Mode
// ─────────────────────────────────────────────────────────────
export const TeachToggle = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

export const WisdomText = styled.div`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  padding: 16px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  margin-bottom: 16px;
`;

export const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);
`;

export const DataLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const DataValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--accent-primary, #60C0F0);
  text-align: right;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Plan Mode Controls
// PURPOSE: Duration, sessions/week selectors for multi-week plan generation
// ─────────────────────────────────────────────────────────────
export const PlanModeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  border-radius: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const PlanModeLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

export const SmallSelect = styled.select`
  background: var(--bg-base, #030712);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 6px 28px 6px 10px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  min-height: 44px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2360C0F0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Mesocycle Display
// PURPOSE: Visual timeline of periodized training blocks
// ─────────────────────────────────────────────────────────────
export const MesocycleSection = styled.div`
  margin-top: 24px;
`;

export const MesocycleSectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const MesocycleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`;

export const MesocycleCard = styled.div<{ $phase: number }>`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid ${({ $phase }) =>
    $phase <= 2 ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)' :
    $phase <= 3 ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)' :
    $phase === 4 ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)' :
    'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)'
  };
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $phase }) =>
      $phase <= 2 ? 'var(--accent-primary, #60C0F0)' :
      $phase <= 3 ? 'var(--accent-secondary, #8B5CF6)' :
      $phase === 4 ? 'var(--accent-gold, #C6A84B)' :
      'var(--danger, #C92A54)'
    };
  }
`;

export const MesocycleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

export const MesocycleTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const MesocycleWeeks = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  padding: 2px 8px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 6px;
`;

export const MesocyclePhase = styled.div<{ $phase: number }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ $phase }) =>
    $phase <= 2 ? 'var(--accent-primary, #60C0F0)' :
    $phase <= 3 ? 'var(--accent-secondary, #8B5CF6)' :
    $phase === 4 ? 'var(--accent-gold, #C6A84B)' :
    'var(--danger, #C92A54)'
  };
  margin-bottom: 8px;
`;

export const MesocycleParams = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-bottom: 10px;
`;

export const MesocycleParam = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));

  span {
    color: var(--text-primary, #E0ECF4);
    font-weight: 500;
  }
`;

export const MesocycleOverload = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

export const DeloadBadge = styled.span`
  display: inline-block;
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Weekly Schedule & Recommendations
// ─────────────────────────────────────────────────────────────
export const ScheduleRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

export const ScheduleDay = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
  min-width: 100px;
  flex: 1;
`;

export const ScheduleDayNumber = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  margin-bottom: 4px;
`;

export const ScheduleDayFocus = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-primary, #E0ECF4);
  text-transform: capitalize;
`;

export const RecommendationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
`;

export const RecommendationItem = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  padding: 6px 0 6px 16px;
  position: relative;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.04));

  &::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent-primary, #60C0F0);
  }
`;

// ─────────────────────────────────────────────────────────────
// L5 (2026-05-02) — Client self-service status pill
// Renders a small read-only chip below the planner's ControlRow that
// surfaces the selected client's `canGenerateWorkoutPlans` flag. Three
// states: enabled (purple/secondary), disabled (muted), blocked
// (warning/red — fires only when the viewer IS the affected client).
// ─────────────────────────────────────────────────────────────
type SelfGenPillStatus = 'enabled' | 'disabled' | 'blocked' | 'unknown';

export const ClientSelfGenPill = styled.div<{ $status: SelfGenPillStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  border: 1px solid ${({ $status }) =>
    $status === 'enabled'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent)'
      : $status === 'blocked'
        ? 'color-mix(in srgb, var(--accent-error, #F87171) 45%, transparent)'
        : 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.4)) 30%, transparent)'};
  background: ${({ $status }) =>
    $status === 'enabled'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419))'
      : $status === 'blocked'
        ? 'color-mix(in srgb, var(--accent-error, #F87171) 12%, var(--bg-elevated, #141419))'
        : 'var(--bg-elevated, #141419)'};
  color: ${({ $status }) =>
    $status === 'enabled'
      ? 'var(--accent-secondary, #8B5CF6)'
      : $status === 'blocked'
        ? 'var(--accent-error, #F87171)'
        : 'var(--text-muted, rgba(224, 236, 244, 0.55))'};
  & strong {
    color: var(--text-primary, #E0ECF4);
    font-weight: 700;
  }
`;

export const PillHint = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-weight: 400;
`;
