/**
 * Frame, loading, navigation, and action styles for SystemAnalytics.
 */

import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const analyticsTheme = {
  bgDefault: 'var(--analytics-bg-default, rgba(10, 15, 30, 0.8))',
  border: 'var(--analytics-border, rgba(96, 192, 240, 0.22))',
  text: 'var(--analytics-text, #E0ECF4)',
  textSecondary: 'var(--analytics-text-secondary, #94a3b8)',
  accent: 'var(--analytics-accent, #60C0F0)',
  accentActive: 'var(--analytics-active-bg, #002060)',
  accentLight: 'var(--analytics-accent-light, rgba(96, 192, 240, 0.15))',
  purpleGlow: 'var(--analytics-purple-glow, rgba(139, 92, 246, 0.34))',
};

export const Container = styled.div`
  color: ${analyticsTheme.text};
`;

export const CenteredBox = styled.div`
  min-height: 320px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const Spinner = styled.div.attrs({ role: 'status', 'aria-label': 'Loading analytics' })`
  width: 40px;
  height: 40px;
  border: 4px solid ${analyticsTheme.border};
  border-top-color: ${analyticsTheme.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const EmptyState = styled.div`
  padding: 24px;
`;

export const Heading2 = styled.h2`
  margin: 0 0 8px;
  color: ${analyticsTheme.text};
  font-size: 1.4rem;
  font-weight: 700;
`;

export const BodyText = styled.p`
  margin: 0 0 16px;
  color: ${analyticsTheme.text};
  font-size: 0.95rem;
  line-height: 1.5;
`;

export const TabBar = styled.div`
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? analyticsTheme.accent : analyticsTheme.border)};
  background: ${({ $active }) => ($active ? analyticsTheme.accentActive : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--analytics-active-text, #ffffff)' : analyticsTheme.textSecondary)};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover,
  &:focus-visible {
    border-color: ${analyticsTheme.accent};
    background: ${({ $active }) => ($active ? analyticsTheme.accentActive : analyticsTheme.accentLight)};
    color: ${analyticsTheme.text};
    box-shadow: 0 0 18px ${analyticsTheme.purpleGlow};
    outline: none;
  }
`;

export const TimeRangeButton = styled(TabButton)`
  padding-inline: 14px;
  font-size: 0.8rem;
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--analytics-button-bg, #002060);
  color: var(--analytics-button-text, #ffffff);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 22px ${analyticsTheme.purpleGlow};
`;

export const FlexCenter = styled.div`
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const FlexGap = styled.div<{ $gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${({ $gap = 8 }) => `${$gap}px`};
`;
