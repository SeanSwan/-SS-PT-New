/**
 * CoachIntakeHealthStrip.styles.ts
 * ================================
 * Compact queue-health telemetry strip for the Coach intake workspace.
 */
import styled from 'styled-components';

export const HealthStrip = styled.section<{ $tone: 'healthy' | 'attention' | 'degraded' | 'unavailable' }>`
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(0, 1.2fr) minmax(190px, 0.9fr);
  gap: 8px;
  align-items: stretch;
  margin: 0 0 12px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'healthy') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)';
    if ($tone === 'attention') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent)';
    return 'color-mix(in srgb, var(--danger, #f87171) 34%, transparent)';
  }};
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-midnight-sapphire, #002060) 26%, transparent),
      color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)
    ),
    var(--bg-surface, #1A1A24);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const HealthBlock = styled.div`
  min-width: 0;
  min-height: 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-base, #030712) 42%, transparent);
`;

export const HealthLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  text-transform: uppercase;
`;

export const HealthValue = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.35;
  letter-spacing: 0;
`;

export const HealthStatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const HealthPill = styled.span<{ $tone?: 'cyan' | 'gold' | 'red' }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'red') return 'color-mix(in srgb, var(--danger, #f87171) 32%, transparent)';
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'red') return 'var(--danger-soft, #fca5a5)';
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    return 'var(--accent-primary, #60C0F0)';
  }};
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  white-space: nowrap;
`;

export const HealthActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 8px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background: color-mix(in srgb, var(--color-midnight-sapphire, #002060) 58%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    outline: none;
  }
`;
