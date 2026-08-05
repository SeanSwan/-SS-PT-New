/**
 * BodyMapSVG.styles.ts — styled-components + hit-area constants for the map
 * =========================================================================
 * Extracted 2026-08-04 (dry-loop R4, Rule 4 300-line cap relief).
 */
import styled, { css, keyframes } from 'styled-components';
import { device } from '../../styles/breakpoints';

// ── Animations ──────────────────────────────────────────────────────────

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// ── Styled Components ───────────────────────────────────────────────────

export const MapContainer = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: flex-start;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;

  ${device.md} {
    flex-direction: row;
    gap: 24px;
  }

  ${device.xxxl} {
    gap: 32px;
  }
`;

export const ViewPanel = styled.div`
  background: var(--bg-elevated, rgba(0, 32, 96, 0.8));
  border: 1px solid var(--border-soft, rgba(64, 112, 192, 0.2));
  border-radius: 16px;
  backdrop-filter: blur(12px);
  padding: 10px;
  text-align: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  touch-action: manipulation;
  box-sizing: border-box;
  min-width: 0;

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, rgba(0, 20, 60, 0.95));
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  ${device.sm} {
    max-width: 300px;
    padding: 14px;
  }

  ${device.md} {
    flex: 1;
    max-width: 320px;
    min-width: 0;
  }

  ${device.xxxl} {
    max-width: 400px;
    padding: 20px;
  }
`;

export const ViewLabel = styled.h4`
  color: var(--accent-primary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 12px 0;
  position: relative;
  padding-bottom: 8px;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    max-width: 120px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent-primary, #8B5CF6), transparent);
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  }
`;

export const ResponsiveSVG = styled.svg`
  width: 100%;
  height: auto;
  max-width: 280px;
  display: block;
  margin: 0 auto;
  overflow: visible;

  ${device.xxxl} {
    max-width: 360px;
  }
`;

// Zoom/pan lives in ZoomablePanel.tsx since Slice 3 (per-panel state, pan-y
// page scroll, visible controls).

export const ChipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

export const ChipLabel = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.55));
  font-size: 12px;
`;

export const Chip = styled.button`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.3));
  background: var(--bg-elevated, rgba(0, 32, 96, 0.8));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;

  &:hover { border-color: var(--glow-accent, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

/**
 * Minimum radius for interactive ellipses to guarantee 44px touch targets.
 * For a 280px-wide SVG mapping to 200 viewBox units:
 *   44px → 200/280 * 44/2 = 15.7 viewBox units
 * Using 22 guarantees 44px diameter at any reasonable scale.
 */
export const HIT_AREA_MIN_R = 22;

export interface RegionEllipseProps {
  $isActive: boolean;
  $isSelected: boolean;
  $severityColor: string | null;
  $tier: 'severe' | 'moderate' | 'mild' | null;
}

/**
 * Slice 3 (B8): severity is multi-channel — color (non-adjacent tokens),
 * stroke pattern (moderate = dashed), fill (severe = filled + halo), numeric
 * pill, and pulse ONLY at severe (respecting prefers-reduced-motion).
 * Selection/hover/focus moved to Ice Wing so they can't be confused with the
 * severe (Wing Purple) tier.
 */
export const RegionEllipse = styled.ellipse<RegionEllipseProps>`
  fill: ${({ $tier, $severityColor }) =>
    $tier === 'severe' && $severityColor
      ? `color-mix(in srgb, ${$severityColor} 22%, transparent)`
      : 'transparent'};
  stroke: ${({ $isActive, $isSelected, $severityColor }) =>
    $isSelected
      ? 'var(--accent-primary, #60C0F0)'
      : $isActive && $severityColor
        ? $severityColor
        : 'rgba(64, 112, 192, 0.30)'};
  stroke-width: ${({ $isSelected }) => ($isSelected ? 2.5 : 1.5)};
  stroke-dasharray: ${({ $tier }) => ($tier === 'moderate' ? '4 2' : 'none')};
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $tier }) =>
    $tier === 'severe' &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        animation: ${pulse} 2s ease-in-out infinite;
      }
    `}

  &:hover {
    stroke: var(--accent-primary, #60C0F0);
    stroke-width: 2;
    filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.5));
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    stroke: var(--accent-primary, #60C0F0);
    stroke-width: 3;
    filter: drop-shadow(0 0 12px rgba(96, 192, 240, 0.6));
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const PainDot = styled.circle<{ $color: string }>`
  fill: ${({ $color }) => $color};
  stroke: var(--text-primary, #E0ECF4);
  stroke-width: 2;
  filter: drop-shadow(0 0 6px ${({ $color }) => $color});
  pointer-events: none;
`;

// ── Body outlines live in bodyOutlines.tsx (Slice 2 — adds NEUTRAL figure) ──

