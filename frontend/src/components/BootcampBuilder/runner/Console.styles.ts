/**
 * ============================================================================
 * FILE: runner/Console.styles.ts
 * PURPOSE: Trainer Console styling — the coach-facing surface where Wing
 *          Purple lives. SWA-105 Slice 7.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 * Touch reality: sweaty hands, moving fast. Every control >= 44px (Rule 2);
 * the primary transport buttons run 56px+. Dual-Button Glow discipline:
 * blue bg -> purple glow, purple bg -> cyan glow.
 */

import styled, { css } from 'styled-components';

export const ConsoleRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  min-height: 100%;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
`;

export const NowBar = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface-dark, #141419);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 14px;
  padding: 14px 18px;
`;

export const NowLabel = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
`;

export const NowClock = styled.div`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--accent-primary, #60c0f0);
`;

export const Transport = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const buttonBase = css`
  min-height: 56px;
  min-width: 84px;
  padding: 0 18px;
  border-radius: 12px;
  border: none;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);

  &:focus-visible {
    outline: 3px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase};
  background: var(--primary, #002060);
  box-shadow: 0 0 14px rgba(139, 92, 246, 0.45); /* blue bg -> purple glow */
`;

export const CoachButton = styled.button`
  ${buttonBase};
  background: var(--accent-glow, #8b5cf6);
  box-shadow: 0 0 14px rgba(96, 192, 240, 0.45); /* purple bg -> cyan glow */
`;

export const QuietButton = styled.button`
  ${buttonBase};
  background: var(--surface-dark, #1a1a24);
  border: 1px solid rgba(224, 236, 244, 0.2);
`;

export const StationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const StationRow = styled.div<{ $tight?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface-dark, #141419);
  border: 1px solid ${({ $tight }) => ($tight ? 'var(--accent-luxury, #c6a84b)' : 'rgba(96, 192, 240, 0.2)')};
  border-radius: 12px;
  padding: 12px 14px;
`;

export const DeckPanel = styled.div`
  background: var(--surface-dark, #1a1a24);
  border: 1px solid var(--accent-glow, #8b5cf6);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const DeckRowButton = styled.button<{ $relaxed?: boolean }>`
  ${buttonBase};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: var(--surface-dark, #141419);
  border: 1px solid ${({ $relaxed }) => ($relaxed ? 'var(--accent-luxury, #c6a84b)' : 'rgba(96, 192, 240, 0.35)')};
`;

export const Chip = styled.span<{ $tone: 'structural' | 'earned' | 'relaxed' }>`
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
  ${({ $tone }) => $tone === 'relaxed'
    ? css`background: rgba(198, 168, 75, 0.18); color: var(--accent-luxury, #c6a84b);`
    : $tone === 'earned'
      ? css`background: rgba(139, 92, 246, 0.18); color: var(--accent-glow, #8b5cf6);`
      : css`background: rgba(96, 192, 240, 0.15); color: var(--accent-primary, #60c0f0);`}
`;

export const OutsNotice = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--accent-luxury, #c6a84b);
`;

export const DegradedBanner = styled.div`
  background: rgba(198, 168, 75, 0.15);
  border: 1px solid var(--accent-luxury, #c6a84b);
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
`;
