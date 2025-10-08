/**
 * Button Components
 * =================
 * Accessible, styled button components with proper focus states
 */

import styled, { css } from 'styled-components';

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
  
  /* Accessibility: Clear focus indicator */
  &:focus-visible {
    outline: 2px solid #3b82f6;
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
  background: linear-gradient(135deg, #3b82f6, #1e40af);
  color: #ffffff;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #1e40af, #1e3a8a);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// Outlined button
export const OutlinedButton = styled.button`
  ${baseButtonStyles}
  background: transparent;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
  }
  
  &:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
`;

// Secondary button (subtle)
export const SecondaryButton = styled.button`
  ${baseButtonStyles}
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// Icon-only button
export const IconButton = styled.button<{ 
  'aria-label': string;
  size?: 'small' | 'medium' | 'large';
}>`
  ${baseButtonStyles}
  background: transparent;
  color: #ffffff;
  padding: ${props => 
    props.size === 'small' ? '0.375rem' :
    props.size === 'large' ? '0.75rem' :
    '0.5rem'
  };
  border-radius: 50%;
  min-width: auto;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }
  
  /* Ensure icon is centered */
  svg {
    display: block;
  }
`;

// Danger button
export const DangerButton = styled.button`
  ${baseButtonStyles}
  background: #ef4444;
  color: #ffffff;
  
  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
`;

// Success button
export const SuccessButton = styled.button`
  ${baseButtonStyles}
  background: #10b981;
  color: #ffffff;
  
  &:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

// Button group container
export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;
