/**
 * Button Components
 * =================
 * Accessible, styled button components with proper focus states
 */

import styled, { css } from 'styled-components';

const SCHEDULE_BUTTON_THEME = {
  focus: 'var(--accent-primary, #60C0F0)',
  tapHighlight: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)',
  primaryGradient: 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))',
  primaryText: 'var(--text-primary, #E0ECF4)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  subtleBackground: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent)',
  subtleHoverBackground: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)',
  subtleActiveBackground: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)',
  subtleBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)',
  subtleHoverBorder: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 28%, transparent)',
  primaryGlow: 'var(--shadow-glow-primary, 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent))',
  danger: 'var(--danger, #EF4444)',
  dangerHover: 'var(--danger-hover, #DC2626)',
  dangerShadow: 'var(--shadow-danger, 0 4px 12px color-mix(in srgb, var(--danger, #EF4444) 32%, transparent))',
  success: 'var(--success, #10B981)',
  successHover: 'var(--success-hover, #059669)',
  successShadow: 'var(--shadow-success, 0 4px 12px color-mix(in srgb, var(--success, #10B981) 32%, transparent))',
} as const;

// Base button styles
const baseButtonStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  position: relative;

  /* P1-6: WCAG minimum touch target */
  min-height: 44px;
  min-width: 44px;

  /* P1-4: Mobile touch feedback */
  -webkit-tap-highlight-color: ${SCHEDULE_BUTTON_THEME.tapHighlight};
  touch-action: manipulation; /* Remove 300ms tap delay */

  /* Accessibility: Clear focus indicator */
  &:focus-visible {
    outline: 2px solid ${SCHEDULE_BUTTON_THEME.focus};
    outline-offset: 2px;
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Icon alignment */
  svg {
    flex-shrink: 0;
  }
`;

// Primary button (filled)
export const PrimaryButton = styled.button`
  ${baseButtonStyles}
  background: ${SCHEDULE_BUTTON_THEME.primaryGradient};
  color: ${SCHEDULE_BUTTON_THEME.primaryText};

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: ${SCHEDULE_BUTTON_THEME.primaryGlow};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// Outlined button
export const OutlinedButton = styled.button`
  ${baseButtonStyles}
  background: transparent;
  color: ${SCHEDULE_BUTTON_THEME.textPrimary};
  border: 1px solid ${SCHEDULE_BUTTON_THEME.subtleHoverBorder};
  
  &:hover:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.subtleBackground};
    border-color: ${SCHEDULE_BUTTON_THEME.focus};
  }
  
  &:active:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.subtleActiveBackground};
  }
`;

// Secondary button (subtle)
export const SecondaryButton = styled.button`
  ${baseButtonStyles}
  background: ${SCHEDULE_BUTTON_THEME.subtleBackground};
  color: ${SCHEDULE_BUTTON_THEME.textPrimary};
  border: 1px solid ${SCHEDULE_BUTTON_THEME.subtleBorder};
  
  &:hover:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.subtleHoverBackground};
    border-color: ${SCHEDULE_BUTTON_THEME.subtleHoverBorder};
  }
`;

// Icon-only button
export const IconButton = styled.button<{ 
  'aria-label': string;
  size?: 'small' | 'medium' | 'large';
}>`
  ${baseButtonStyles}
  background: transparent;
  color: ${SCHEDULE_BUTTON_THEME.textPrimary};
  padding: ${props => 
    props.size === 'small' ? '0.375rem' :
    props.size === 'large' ? '0.75rem' :
    '0.5rem'
  };
  border-radius: 50%;
  min-width: 44px;
  
  &:hover:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.subtleHoverBackground};
  }
  
  &:active:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.subtleActiveBackground};
  }
  
  /* Ensure icon is centered */
  svg {
    display: block;
  }
`;

// Danger button
export const DangerButton = styled.button`
  ${baseButtonStyles}
  background: ${SCHEDULE_BUTTON_THEME.danger};
  color: ${SCHEDULE_BUTTON_THEME.textPrimary};
  
  &:hover:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.dangerHover};
    transform: translateY(-1px);
    box-shadow: ${SCHEDULE_BUTTON_THEME.dangerShadow};
  }
`;

// Success button
export const SuccessButton = styled.button`
  ${baseButtonStyles}
  background: ${SCHEDULE_BUTTON_THEME.success};
  color: ${SCHEDULE_BUTTON_THEME.textPrimary};
  
  &:hover:not(:disabled) {
    background: ${SCHEDULE_BUTTON_THEME.successHover};
    transform: translateY(-1px);
    box-shadow: ${SCHEDULE_BUTTON_THEME.successShadow};
  }
`;

// Button group container
export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;
