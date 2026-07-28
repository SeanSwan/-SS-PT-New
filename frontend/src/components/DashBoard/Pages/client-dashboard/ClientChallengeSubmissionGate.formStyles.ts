/**
 * Client challenge idea form styles.
 *
 * Keeps the mounted client challenge gate under the component line budget while
 * preserving dark-first Swan tokens, 44px inputs, and accessible radio controls.
 */

import styled from 'styled-components';

export const IdeaForm = styled.form`
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 32%, transparent);
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.82rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const FieldInput = styled.input`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 68%, transparent);
    outline-offset: 2px;
  }
`;

export const FieldMeta = styled.small`
  margin: -2px 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
  font: 700 0.72rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const FieldTextArea = styled.textarea`
  min-height: 96px;
  resize: vertical;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  padding: 12px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 68%, transparent);
    outline-offset: 2px;
  }
`;

export const VisibilityFieldset = styled.fieldset`
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;

  legend {
    margin-bottom: 8px;
    color: var(--text-primary, #E0ECF4);
    font: 800 0.82rem/1.3 var(--font-ui, 'Sora', sans-serif);
  }
`;

export const VisibilityChoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const VisibilityOption = styled.label`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  min-height: 44px;
  align-items: start;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 36%, transparent);
  cursor: pointer;

  input {
    margin-top: 3px;
    accent-color: var(--accent-primary, #60C0F0);
  }

  strong,
  small {
    display: block;
  }

  small {
    margin-top: 4px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
    font: 650 0.78rem/1.45 var(--font-ui, 'Sora', sans-serif);
  }
`;

export const FieldSelect = styled.select`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 68%, transparent);
    outline-offset: 2px;
  }
`;

export const IntentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const FormReadiness = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--accent-gold, #C6A84B) 86%, var(--text-primary, #E0ECF4));
  font: 800 0.82rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const GateButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: 8px;
  padding: 0 16px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--surface-primary, #003080) 68%, var(--bg-base, #0A0A0F));
  font: 800 0.84rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 180ms ease;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60C0F0);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 68%, transparent);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;
