import styled, { keyframes } from 'styled-components';

const borderSoft = 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent))';
const borderFaint = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
const textMuted = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent))';
const textSecondary = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent))';
const accentSoft = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
const accentFaint = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';
const hoverLand = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, var(--map-land, #4A6081))';
const shadowStrong = 'color-mix(in srgb, var(--bg-base, #030712) 55%, transparent)';
const shadowGlow = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)';

const pulse = keyframes`
  0% { opacity: 0.42; }
  50% { opacity: 0.16; }
  100% { opacity: 0.42; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const MapWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${borderSoft};
  border-radius: 16px;
  overflow: hidden;
`;

export const MapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${borderFaint};
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const GlobeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const MapTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const MapSubtitle = styled.p`
  font-size: 0.75rem;
  color: ${textMuted};
  margin: 2px 0 0;
`;

export const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
`;

export const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
  border: 1px solid ${borderSoft};
  background: transparent;
  color: ${textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 200ms ease, border-color 200ms ease, color 200ms ease;

  &:hover:not(:disabled) {
    color: var(--accent-primary, #60C0F0);
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const StatsBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid ${accentFaint};
  overflow-x: auto;
  scrollbar-width: thin;

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

export const InlineNotice = styled.div`
  padding: 8px 20px;
  color: var(--warning, #E5C76B);
  font-size: 0.78rem;
  border-bottom: 1px solid ${accentFaint};
`;

export const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: ${accentFaint};
  border: 1px solid ${accentSoft};
  white-space: nowrap;
  flex-shrink: 0;
  color: ${textMuted};

  svg {
    flex-shrink: 0;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const StatLabel = styled.span`
  font-size: 0.7rem;
  color: ${textMuted};
`;

export const MapContainer = styled.div`
  position: relative;
  background: var(--bg-base, #0A0A0F);
  min-height: 280px;

  .visitor-map-svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .country-geography {
    /* SWA-138: land was --bg-surface on a --bg-base container = 1.14:1, an
       invisible map. Now ~3.1:1 so continents actually read. */
    fill: var(--map-land, #4A6081);
    stroke: var(--map-land-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent));
    stroke-width: 0.5;
    outline: none;
  }
  .country-geography:hover {
    fill: ${hoverLand};
  }
  .state-geography {
    fill: transparent;
    stroke: var(--map-state-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent));
    stroke-width: 0.3;
    outline: none;
  }
  .marker-glow {
    fill: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    animation: ${pulse} 3s ease-in-out infinite;
    transform-origin: center;
  }

  .marker-dot {
    fill: var(--accent-primary, #60C0F0);
    fill-opacity: 0.85;
    stroke: var(--accent-secondary, #8B5CF6);
    stroke-width: 0.5;
    cursor: pointer;
  }

  .marker-count-label {
    font-family: 'Fira Code', monospace;
    font-size: 4px;
    font-weight: 700;
    fill: var(--text-primary, #E0ECF4);
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .marker-glow,
    .spinning {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    min-height: 200px;
  }
`;

export const Tooltip = styled.div<{ $left: number; $top: number }>`
  position: fixed;
  left: ${({ $left }) => `${$left}px`};
  top: ${({ $top }) => `${$top}px`};
  z-index: 1000;
  padding: 8px 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 10px;
  box-shadow: 0 4px 20px ${shadowStrong}, 0 0 12px ${shadowGlow};
  pointer-events: none;
`;

export const TooltipCity = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const TooltipCountry = styled.div`
  font-size: 0.7rem;
  color: ${textMuted};
`;

export const TooltipCount = styled.div`
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  color: var(--accent-primary, #60C0F0);
  margin-top: 2px;
`;

export const ZoomControls = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
`;

export const ZoomBtn = styled(RefreshBtn)`
  background: var(--bg-elevated, #141419);
  color: ${textSecondary};
  box-shadow: 0 2px 8px ${shadowStrong};
`;

export const EmptyOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: ${textMuted};
  font-size: 0.85rem;
  text-align: center;
  padding: 24px;

  svg {
    opacity: 0.45;
  }
`;

export const ErrorOverlay = styled(EmptyOverlay)`
  color: var(--warning, #E5C76B);

  svg {
    opacity: 0.75;
  }
`;
