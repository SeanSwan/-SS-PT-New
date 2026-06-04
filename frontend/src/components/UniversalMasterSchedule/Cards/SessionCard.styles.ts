import styled, { css } from 'styled-components';

const scheduleCardTheme = {
  background: 'var(--schedule-card-bg, color-mix(in srgb, var(--bg-elevated, #141419) 84%, var(--accent-secondary, #8B5CF6) 8%))',
  pastBackground: 'var(--schedule-card-past-bg, color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent))',
  border: 'var(--schedule-card-border, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent))',
  pastBorder: 'var(--schedule-card-past-border, color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent))',
  blockedBorder: 'var(--schedule-card-blocked-border, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent))',
  blockedBackground: 'var(--schedule-card-blocked-bg, color-mix(in srgb, var(--bg-elevated, #141419) 74%, var(--accent-secondary, #8B5CF6) 12%))',
  blockedStripe: 'var(--schedule-card-blocked-stripe, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent))',
  blockedStripeBase: 'var(--schedule-card-blocked-stripe-base, color-mix(in srgb, var(--brand-primary, #002060) 24%, transparent))',
  hoverShadow: 'var(--schedule-card-hover-shadow, 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent))',
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  secondarySoft: 'var(--accent-secondary-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent))',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, rgba(224, 236, 244, 0.72))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.62))',
  success: 'var(--success, #10b981)',
  danger: 'var(--danger, #ef4444)',
  dangerStrong: 'var(--danger-strong, color-mix(in srgb, var(--danger, #ef4444) 85%, var(--bg-base, #0A0A0F) 15%))',
  dangerSoft: 'var(--danger-soft, color-mix(in srgb, var(--danger, #ef4444) 50%, transparent))',
  onDanger: 'var(--text-on-danger, #fff)',
};

const statusDotColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return scheduleCardTheme.success;
    case 'completed':
      return scheduleCardTheme.textMuted;
    case 'cancelled':
      return scheduleCardTheme.danger;
    case 'blocked':
      return scheduleCardTheme.secondary;
    default:
      return scheduleCardTheme.primary;
  }
};

export const LiteCardContainer = styled.div<{ $status: string }>`
  background: ${scheduleCardTheme.background};
  border-radius: 8px;
  border: 1px solid ${scheduleCardTheme.border};
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  min-height: 44px;
`;

export const mobileOptimizations = css`
  /* Disable expensive transforms and shadows on mobile */
  @media (max-width: 768px) {
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }
`;

export const CardContainer = styled.div<{ $status: string; $isPast?: boolean; $liteMode?: boolean }>`
  background: ${({ $isPast }) => ($isPast ? scheduleCardTheme.pastBackground : scheduleCardTheme.background)};
  border-radius: 12px;
  border: 1px solid ${({ $isPast }) => ($isPast ? scheduleCardTheme.pastBorder : scheduleCardTheme.border)};
  opacity: ${({ $isPast }) => $isPast ? 0.7 : 1};
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: ${({ $liteMode }) => $liteMode ? 'none' : 'all 150ms ease-out'};
  position: relative;
  overflow: hidden;
  min-height: 44px; /* Touch target */
  min-width: 0;
  /* NOTE: GPU layer promotion removed - should only be on scroll containers, not individual cards */

  ${({ $status }) =>
    $status === 'blocked' &&
    css`
      border-color: ${scheduleCardTheme.blockedBorder};
      background: ${scheduleCardTheme.blockedBackground};
      background-image: repeating-linear-gradient(
        45deg,
        ${scheduleCardTheme.blockedStripe},
        ${scheduleCardTheme.blockedStripe} 6px,
        ${scheduleCardTheme.blockedStripeBase} 6px,
        ${scheduleCardTheme.blockedStripeBase} 12px
      );
    `}

  &:hover {
    ${({ $isPast, $liteMode }) => !$isPast && !$liteMode && css`
      transform: scale(1.02);
      box-shadow: ${scheduleCardTheme.hoverShadow};
    `}
  }

  &:active {
    ${({ $liteMode }) => !$liteMode && `transform: scale(0.98);`}
  }

  &:focus-visible {
    outline: 2px solid ${scheduleCardTheme.primary};
    outline-offset: 2px;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    gap: 0.35rem;
    /* Disable transforms on mobile for better scroll */
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    gap: 0.3rem;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }
`;

export const StatusDot = styled.span<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $status }) => statusDotColor($status)};
  box-shadow: 0 0 8px currentColor;
`;

export const TimeLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${scheduleCardTheme.textPrimary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

export const DurationLabel = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${scheduleCardTheme.textSecondary};
  word-break: break-word;
`;

export const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
  flex-shrink: 0;
`;

export const Indicator = styled.span<{ $type: 'reminder' | 'feedback' }>`
  font-size: 0.7rem;
  opacity: 0.9;
  cursor: help;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

export const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

export const NameText = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${scheduleCardTheme.textPrimary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

export const MetaText = styled.span`
  font-size: 0.75rem;
  color: ${scheduleCardTheme.textSecondary};
  word-break: break-word;
`;

export const SessionsBadge = styled.span<{ $low: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${({ $low }) => ($low ? scheduleCardTheme.dangerStrong : scheduleCardTheme.secondarySoft)};
  color: ${({ $low }) => ($low ? scheduleCardTheme.onDanger : scheduleCardTheme.secondary)};
  border: 1px solid ${({ $low }) => ($low ? scheduleCardTheme.dangerSoft : scheduleCardTheme.border)};
  border-radius: 8px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.3;
  min-width: 20px;
  text-align: center;
  z-index: 1;

  @media (max-width: 480px) {
    font-size: 0.6rem;
    padding: 1px 4px;
    top: 4px;
    right: 4px;
  }
`;

export const PackageInfo = styled.span`
  font-size: 0.625rem;
  color: ${scheduleCardTheme.textMuted};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
