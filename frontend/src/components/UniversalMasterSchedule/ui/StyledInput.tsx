/**
 * Input Components
 * ================
 * Accessible form input components with proper label associations
 */

import styled, { css } from 'styled-components';
import { Label, ErrorText, HelperText } from './Typography';

export const SCHEDULE_INPUT_THEME = {
  surface: 'var(--input-bg, rgba(224, 236, 244, 0.05))',
  surfaceHover: 'var(--input-bg-hover, rgba(224, 236, 244, 0.08))',
  surfaceFocus: 'var(--input-bg-focus, rgba(224, 236, 244, 0.10))',
  border: 'var(--input-border, rgba(96, 192, 240, 0.20))',
  borderHover: 'var(--input-border-hover, rgba(96, 192, 240, 0.30))',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSoft: 'var(--input-focus-ring, rgba(96, 192, 240, 0.16))',
  danger: 'var(--danger, #EF4444)',
  dangerSoft: 'var(--danger-ring, rgba(239, 68, 68, 0.14))',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, rgba(224, 236, 244, 0.72))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.50))',
} as const;

// Base input styles - P1-3 Fix: 16px font-size on mobile prevents iOS auto-zoom
const baseInputStyles = css`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${SCHEDULE_INPUT_THEME.surface};
  border: 1px solid ${SCHEDULE_INPUT_THEME.border};
  border-radius: 6px;
  color: ${SCHEDULE_INPUT_THEME.textPrimary};
  font-size: 1rem; /* P1-3: 16px minimum prevents iOS auto-zoom */
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
  min-height: 44px; /* P1-2: WCAG touch target */

  &::placeholder {
    color: ${SCHEDULE_INPUT_THEME.textMuted};
  }

  &:hover:not(:disabled) {
    border-color: ${SCHEDULE_INPUT_THEME.borderHover};
    background: ${SCHEDULE_INPUT_THEME.surfaceHover};
  }

  &:focus {
    border-color: ${SCHEDULE_INPUT_THEME.accent};
    background: ${SCHEDULE_INPUT_THEME.surfaceFocus};
    box-shadow: 0 0 0 3px ${SCHEDULE_INPUT_THEME.accentSoft};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const errorInputStyles = css`
  border-color: ${SCHEDULE_INPUT_THEME.danger};

  &:focus {
    border-color: ${SCHEDULE_INPUT_THEME.danger};
    box-shadow: 0 0 0 3px ${SCHEDULE_INPUT_THEME.dangerSoft};
  }
`;

// Text input
export const StyledInput = styled.input<{ hasError?: boolean }>`
  ${baseInputStyles}

  ${props => props.hasError && errorInputStyles}
`;

// Textarea
export const StyledTextarea = styled.textarea<{ hasError?: boolean }>`
  ${baseInputStyles}
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  ${props => props.hasError && errorInputStyles}
`;

// Form field wrapper (groups label, input, error/helper text)
export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1rem;
`;

// Input group (for inputs with icons or buttons)
export const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
`;

// Input with icon container
export const InputWithIcon = styled.div`
  position: relative;
  width: 100%;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${SCHEDULE_INPUT_THEME.textMuted};
    pointer-events: none;
  }
  
  input {
    padding-left: 2.75rem;
  }
`;

// Checkbox/Radio wrapper
export const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  
  input[type="checkbox"],
  input[type="radio"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: ${SCHEDULE_INPUT_THEME.accent};
    
    &:focus-visible {
      outline: 2px solid ${SCHEDULE_INPUT_THEME.accent};
      outline-offset: 2px;
    }
  }
  
  span {
    color: ${SCHEDULE_INPUT_THEME.textPrimary};
    font-size: 0.875rem;
  }
`;

// Number input with increment/decrement buttons
export const NumberInput = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  input[type="number"] {
    ${baseInputStyles}
    text-align: center;
    
    /* Hide default number input arrows */
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: ${SCHEDULE_INPUT_THEME.surface};
    border: 1px solid ${SCHEDULE_INPUT_THEME.border};
    border-radius: 4px;
    color: ${SCHEDULE_INPUT_THEME.textPrimary};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: ${SCHEDULE_INPUT_THEME.surfaceHover};
      border-color: ${SCHEDULE_INPUT_THEME.borderHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

// Export wrapper components for convenience
export { Label, ErrorText, HelperText };
