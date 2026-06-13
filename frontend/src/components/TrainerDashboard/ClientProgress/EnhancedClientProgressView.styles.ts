/**
 * COMPONENT: EnhancedClientProgressView.styles
 * PURPOSE: Styled shell primitives for the canonical trainer client-progress surface.
 * OWNER: Trainer Dashboard / Client Progress
 * DATA FLOW: Pure presentation only. No API calls, routing, or client identity logic.
 */
import styled from 'styled-components';
import type { ClientData } from './Analytics';
import { SwanTabBar, SwanTabButton } from '../../common/SwanTabs.styles';

export const PageWrapper = styled.div`
  padding: 24px;
`;

export const GlassPanel = styled.div`
  background: var(--bg-elevated, color-mix(in srgb, var(--bg-surface, #1A1A24) 95%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
`;

export const HeaderLeft = styled.div``;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

export const Heading4 = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px 0;
`;

export const BodyText = styled.p`
  font-size: 1rem;
  color: var(--text-secondary, #A9B7C8);
  margin: 0;
`;

export const SmallText = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary, #A9B7C8);
`;

export const CaptionText = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary, #A9B7C8);
  display: block;
  margin-bottom: 8px;
`;

export const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-height: 44px;
  user-select: none;
`;

export const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 48px;
  height: 26px;
  border-radius: 13px;
  background: ${({ $checked }) => ($checked
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--text-secondary, #A9B7C8) 30%, transparent)')};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

export const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? '24px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--button-text, #FFFFFF);
  transition: left 0.2s ease;
  box-shadow: var(--shadow-subtle, 0 1px 3px color-mix(in srgb, var(--bg-base, #0A0A0F) 30%, transparent));
`;

export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

interface RiskChipProps {
  $level: ClientData['riskLevel'];
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  low: {
    bg: 'var(--status-success-soft, color-mix(in srgb, var(--status-success, #4ade80) 15%, transparent))',
    text: 'var(--status-success, #4ade80)',
    border: 'var(--status-success-border, color-mix(in srgb, var(--status-success, #4ade80) 30%, transparent))',
  },
  medium: {
    bg: 'var(--status-warning-soft, color-mix(in srgb, var(--status-warning, #facc15) 15%, transparent))',
    text: 'var(--status-warning, #facc15)',
    border: 'var(--status-warning-border, color-mix(in srgb, var(--status-warning, #facc15) 30%, transparent))',
  },
  high: {
    bg: 'var(--status-danger-soft, color-mix(in srgb, var(--status-danger, #f87171) 15%, transparent))',
    text: 'var(--status-danger, #f87171)',
    border: 'var(--status-danger-border, color-mix(in srgb, var(--status-danger, #f87171) 30%, transparent))',
  },
  unknown: {
    bg: 'color-mix(in srgb, var(--text-secondary, #A9B7C8) 12%, transparent)',
    text: 'var(--text-secondary, #A9B7C8)',
    border: 'color-mix(in srgb, var(--text-secondary, #A9B7C8) 28%, transparent)',
  },
};

export const RiskChip = styled.span<RiskChipProps>`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: ${({ $level }) => riskColors[$level]?.bg ?? riskColors.medium.bg};
  color: ${({ $level }) => riskColors[$level]?.text ?? riskColors.medium.text};
  border: 1px solid ${({ $level }) => riskColors[$level]?.border ?? riskColors.medium.border};
`;

export const AlertBanner = styled.div`
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 8px;
  padding: 14px 18px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  line-height: 1.5;
`;

export const TabsContainer = styled.div`
  width: 100%;
  margin-bottom: 24px;
`;

export const TabBar = styled(SwanTabBar)``;

export const TabButton = styled(SwanTabButton)``;

export const TabPanelWrapper = styled.div`
  padding: 24px 0;
`;

export const SmallButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const QuickActionBar = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 20;
  background: var(--bg-elevated, color-mix(in srgb, var(--bg-surface, #1A1A24) 95%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 12px;
  max-width: calc(100vw - 40px);
  padding: 16px;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-strong, 0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 40%, transparent));

  @media (max-width: 640px) {
    position: sticky;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    left: auto;
    right: auto;
    margin-top: 16px;
    max-width: none;
    padding: 12px;
    width: 100%;
  }
`;

export const QuickActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 640px) {
    ${SmallButton} {
      flex: 1 1 92px;
      justify-content: center;
    }
  }
`;
