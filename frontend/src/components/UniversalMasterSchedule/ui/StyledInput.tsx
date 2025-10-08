/**
 * Input Components
 * ================
 * Accessible form input components with proper label associations
 */

import styled from 'styled-components';
import { Label, ErrorText, HelperText } from './Typography';

// Base input styles
const baseInputStyles = `
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
  
  &:focus {
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Text input
export const StyledInput = styled.input<{ hasError?: boolean }>`
  ${baseInputStyles}
  
  ${props => props.hasError && `
    border-color: #ef4444;
    
    &:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
`;

// Textarea
export const StyledTextarea = styled.textarea<{ hasError?: boolean }>`
  ${baseInputStyles}
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  
  ${props => props.hasError && `
    border-color: #ef4444;
    
    &:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
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
    color: rgba(255, 255, 255, 0.5);
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
    accent-color: #3b82f6;
    
    &:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  }
  
  span {
    color: #e2e8f0;
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
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

// Export wrapper components for convenience
export { Label, ErrorText, HelperText };
