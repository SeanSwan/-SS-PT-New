/**
 * ============================================================================
 * FILE: NutritionCoachPanels.styles.ts
 * PURPOSE: Styled primitives for the Phase 4A actual-vs-target grid, date
 *          stepper (Dual-Button Glow: purple bg -> cyan glow), and trend panel.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 * Arctic Cyan (#50A0F0) is data-only: it paints the fill bars and the Victory
 * logged line, never buttons or glows (Active Palette law).
 */
import styled from 'styled-components';
import { swanMetricTile } from '../clientCardSystem';

const alpha = (token: string, fallback: string, amount: number) =>
  `color-mix(in srgb, var(${token}, ${fallback}) ${amount}%, transparent)`;

/* --------------------------- actual vs target grid ------------------------- */

export const TargetGridCard = styled.section`
  ${swanMetricTile}
  display: grid;
  gap: 10px;
  padding: 14px;
`;

export const TargetGridTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;
`;

export const TargetGridRows = styled.div`
  display: grid;
  gap: 9px;
`;

export const TargetGridRow = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: 414px) {
    grid-template-columns: 64px minmax(0, 1fr);

    span:last-child {
      grid-column: 1 / -1;
      justify-self: end;
    }
  }
`;

export const TargetRowLabel = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 75)});
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
`;

export const TargetRowValue = styled.span<{ $over?: boolean }>`
  color: ${({ $over }) => ($over ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`;

export const TargetBarTrack = styled.div`
  position: relative;
  height: 10px;
  min-width: 0;
  border-radius: 999px;
  overflow: hidden;
  background: ${alpha('--bg-elevated', '#141419', 92)};
  border: 1px solid ${alpha('--chart-data', '#50A0F0', 18)};
`;

/** Width driven by inline style (attrs) so each percent doesn't mint a class. */
export const TargetBarFill = styled.div.attrs<{ $percent: number }>(({ $percent }) => ({
  style: { width: `${Math.max(0, Math.min(100, $percent))}%` },
}))<{ $percent: number }>`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    ${alpha('--chart-data', '#50A0F0', 70)},
    var(--chart-data, #50A0F0)
  );
`;

export const TargetEmptyState = styled.div`
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 6px 0 2px;
`;

export const TargetEmptyCopy = styled.p`
  margin: 0;
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 78)});
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

/* ------------------------------- date stepper ------------------------------ */

export const StepperRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
`;

/** Dual-Button Glow rule: purple background -> cyan glow on hover/focus. */
export const StepperButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid ${alpha('--accent-purple', '#8B5CF6', 40)};
  background: linear-gradient(
    150deg,
    ${alpha('--accent-purple', '#8B5CF6', 34)},
    color-mix(in srgb, var(--surface-elevated, #003080) 78%, var(--accent-purple, #8B5CF6))
  );
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    border-color: ${alpha('--accent-primary', '#60C0F0', 55)};
    box-shadow: 0 0 20px ${alpha('--accent-primary', '#60C0F0', 30)};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StepperDateLabel = styled.span`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--accent-primary, #60C0F0);
  background: ${alpha('--accent-primary', '#60C0F0', 10)};
  border: 1px solid ${alpha('--accent-primary', '#60C0F0', 22)};
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
`;

export const RangeToggleButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  margin-left: auto;
  border: 1px solid ${({ $active }) => (
    $active
      ? alpha('--accent-primary', '#60C0F0', 55)
      : alpha('--accent-purple', '#8B5CF6', 40)
  )};
  background: ${({ $active }) => (
    $active
      ? `linear-gradient(150deg, ${alpha('--accent-purple', '#8B5CF6', 44)}, color-mix(in srgb, var(--surface-elevated, #003080) 70%, var(--accent-purple, #8B5CF6)))`
      : `linear-gradient(150deg, ${alpha('--accent-purple', '#8B5CF6', 24)}, color-mix(in srgb, var(--surface-elevated, #003080) 84%, var(--accent-purple, #8B5CF6)))`
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: ${alpha('--accent-primary', '#60C0F0', 55)};
    box-shadow: 0 0 20px ${alpha('--accent-primary', '#60C0F0', 28)};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 414px) {
    margin-left: 0;
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* -------------------------------- trend panel ------------------------------ */

export const TrendShell = styled.section`
  ${swanMetricTile}
  display: grid;
  gap: 8px;
  padding: 12px;
`;

export const TrendToggleButton = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TrendChartFrame = styled.div`
  min-width: 0;
  overflow: hidden;
`;

export const TrendFallback = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 75)});
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

export const TrendLegend = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 70)});
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 800;
`;
