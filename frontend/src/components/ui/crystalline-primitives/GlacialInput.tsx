/**
 * GlacialInput — Ice-carved input fields for CRM Lead Funnel
 * Crystalline Swan palette · 56px premium touch target · WCAG error states
 */
import styled, { css } from 'styled-components';

const glacialBase = css`
  width: 100%;
  height: 56px;
  background: rgba(224, 236, 244, 0.05); /* Frost White 5% */
  border: 1px solid rgba(96, 192, 240, 0.2); /* Ice Wing 20% */
  border-radius: 8px;
  padding: 0 16px;
  color: #E0ECF4; /* Frost White */
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  box-shadow: inset 0 2px 4px rgba(224, 236, 244, 0.1);
  transition: all 0.2s ease-out;

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #60C0F0; /* Ice Wing */
    background: rgba(96, 192, 240, 0.1);
    box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* WCAG error state */
  &[aria-invalid="true"] {
    border-color: #8B5CF6; /* Wing Purple */
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const GlacialInput = styled.input`
  ${glacialBase}
`;

export const GlacialTextarea = styled.textarea`
  ${glacialBase}
  height: auto;
  min-height: 120px;
  padding: 12px 16px;
  resize: vertical;
`;

export const GlacialLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(224, 236, 244, 0.7);
`;
