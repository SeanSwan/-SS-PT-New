/**
 * ============================================================================
 * FILE: NutritionCoachTab.styles.ts
 * PURPOSE: Styled primitives for the Phase 4A coach nutrition tab header,
 *          adherence hero, loading skeleton, and branded error card.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 * Crystalline Swan tokens only (var(--token, #fallback)); 44px interactive
 * minimums; Ice Wing 8% shimmer with a reduced-motion static fallback.
 */
import styled, { css, keyframes } from 'styled-components';
import { swanMetricTile } from '../clientCardSystem';

const alpha = (token: string, fallback: string, amount: number) =>
  `color-mix(in srgb, var(${token}, ${fallback}) ${amount}%, transparent)`;

/* --------------------------------- header --------------------------------- */

export const CoachHeaderRow = styled.header`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
`;

export const CoachHeaderIdentity = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

export const CoachHeaderAlias = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

export const CoachHeaderLastLog = styled.span<{ $tone: 'ok' | 'warn' | 'none' }>`
  color: ${({ $tone }) => (
    $tone === 'ok'
      ? 'var(--accent-primary, #60C0F0)'
      : $tone === 'warn'
        ? 'var(--accent-gold, #C6A84B)'
        : `var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 70)})`
  )};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
`;

/* ---------------------------- adherence hero ------------------------------- */

export const AdherenceHeroCard = styled.section`
  ${swanMetricTile}
  display: grid;
  gap: 10px;
  padding: 14px;
  border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent);
`;

export const AdherenceHeroTopRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
  min-width: 0;
`;

export const AdherenceHeroValue = styled.strong`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
`;

export const AdherenceHeroLabel = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 72)});
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const AdherenceHeroStreak = styled.span<{ $active?: boolean }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${alpha('--accent-primary', '#60C0F0', 30)};
  background: ${alpha('--accent-primary', '#60C0F0', 10)};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 850;
  ${({ $active }) => ($active ? css`
    box-shadow: 0 0 14px ${alpha('--accent-primary', '#60C0F0', 30)};
  ` : '')}
`;

export const AdherenceChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const AdherenceChipTag = styled.span<{ $tone: 'gold' | 'purple' | 'calm' }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 850;
  background: ${({ $tone }) => (
    $tone === 'gold'
      ? alpha('--accent-gold', '#C6A84B', 14)
      : $tone === 'purple'
        ? alpha('--accent-purple', '#8B5CF6', 16)
        : alpha('--accent-primary', '#60C0F0', 10)
  )};
  border: 1px solid ${({ $tone }) => (
    $tone === 'gold'
      ? alpha('--accent-gold', '#C6A84B', 30)
      : $tone === 'purple'
        ? alpha('--accent-purple', '#8B5CF6', 34)
        : alpha('--accent-primary', '#60C0F0', 20)
  )};
`;

/* ------------------------------ skeleton state ----------------------------- */

const shimmerSweep = keyframes`
  0% { background-position: -180px 0; }
  100% { background-position: 240px 0; }
`;

export const NutritionSkeletonBlock = styled.div<{ $height?: number }>`
  min-height: ${({ $height }) => $height || 64}px;
  border-radius: 12px;
  border: 1px solid ${alpha('--accent-primary', '#60C0F0', 12)};
  background:
    linear-gradient(
      100deg,
      transparent 20%,
      ${alpha('--accent-primary', '#60C0F0', 8)} 50%,
      transparent 80%
    ),
    ${alpha('--bg-elevated', '#141419', 84)};
  background-size: 240px 100%, auto;
  background-repeat: no-repeat, repeat;
  animation: ${shimmerSweep} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${alpha('--accent-primary', '#60C0F0', 12)};
  }
`;

export const NutritionSkeletonStack = styled.div`
  display: grid;
  gap: 10px;
`;

/* -------------------------------- error card ------------------------------- */

export const NutritionErrorCard = styled.div`
  ${swanMetricTile}
  display: grid;
  gap: 10px;
  justify-items: center;
  padding: 20px;
  text-align: center;
  border-color: ${alpha('--accent-gold', '#C6A84B', 26)};
`;

export const NutritionErrorCopy = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
`;

export const NutritionRetryButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid ${alpha('--accent-primary', '#60C0F0', 26)};
  background: color-mix(in srgb, var(--surface-elevated, #003080) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: ${alpha('--accent-primary', '#60C0F0', 50)};
    box-shadow: 0 0 18px ${alpha('--accent-primary', '#60C0F0', 22)};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
