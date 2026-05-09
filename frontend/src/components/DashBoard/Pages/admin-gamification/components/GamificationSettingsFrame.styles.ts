/**
 * Layout, card, banner, and button styles for gamification settings.
 */
import styled, { css } from 'styled-components';

export const PageWrapper = styled.div`
  width: 100%;
`;

export const SettingsStack = styled.div`
  display: grid;
  gap: 24px;
`;

export const AlertBanner = styled.div<{ $variant?: 'warning' | 'info'; $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  margin-top: ${({ $compact }) => ($compact ? '16px' : '0')};
  margin-bottom: ${({ $compact }) => ($compact ? '0' : '24px')};
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--gamification-text, #e2e8f0);
  background: ${({ $variant }) =>
    $variant === 'info'
      ? 'var(--gamification-info-bg, rgba(14, 165, 233, 0.12))'
      : 'var(--gamification-warning-bg, rgba(234, 179, 8, 0.12))'};
  border: 1px solid ${({ $variant }) =>
    $variant === 'info'
      ? 'var(--gamification-info-border, rgba(14, 165, 233, 0.3))'
      : 'var(--gamification-warning-border, rgba(234, 179, 8, 0.3))'};

  svg {
    flex-shrink: 0;
  }
`;

export const AlertContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
`;

export const Heading = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--gamification-text, #e2e8f0);
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const outlinedButton = css`
  background: transparent;
  color: var(--gamification-accent, #0ea5e9);
  border: 1px solid var(--gamification-accent-border, rgba(14, 165, 233, 0.4));

  &:hover:not(:disabled) {
    background: var(--gamification-accent-hover-bg, rgba(14, 165, 233, 0.08));
    border-color: var(--gamification-accent-border-strong, rgba(14, 165, 233, 0.7));
  }
`;

const ghostButton = css`
  background: transparent;
  color: var(--gamification-text, #e2e8f0);
  border: none;
  padding: 6px 12px;

  &:hover:not(:disabled) {
    background: var(--gamification-ghost-hover-bg, rgba(255, 255, 255, 0.06));
  }
`;

const primaryButton = css`
  background: linear-gradient(
    135deg,
    var(--gamification-primary, #0ea5e9),
    var(--gamification-primary-glow, #8B5CF6)
  );
  color: var(--gamification-button-text, #ffffff);
  border: none;

  &:hover:not(:disabled) {
    filter: brightness(1.12);
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'outlined' | 'ghost'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  white-space: nowrap;

  ${({ $variant }) => {
    if ($variant === 'outlined') return outlinedButton;
    if ($variant === 'ghost') return ghostButton;
    return primaryButton;
  }}
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    &.two-col {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

export const GlassCard = styled.div`
  background: var(--gamification-card-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--gamification-card-border, rgba(14, 165, 233, 0.2));
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

export const CardHeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--gamification-accent, #0ea5e9);
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gamification-text, #e2e8f0);
`;

export const FormulaBox = styled.div`
  margin-top: 24px;
`;

export const SubTitle = styled.p`
  margin: 0 0 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--gamification-text, #e2e8f0);
`;

export const CodeBlock = styled.div`
  padding: 12px 16px;
  background: var(--gamification-code-bg, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--gamification-code-border, rgba(14, 165, 233, 0.1));
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
  color: var(--gamification-accent, #0ea5e9);
`;

export const MutedText = styled.p`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: var(--gamification-muted-text, rgba(226, 232, 240, 0.5));
`;

export const SectionSpacer = styled.div`
  margin-top: 16px;
`;
