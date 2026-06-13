/**
 * FILE: CheckoutFulfillmentSection.styles.ts
 * PURPOSE: Form controls for physical-product delivery/pickup details.
 */
import styled from 'styled-components';

export const FulfillmentModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const FulfillmentModeButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent)'};
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent))'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 44%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const FulfillmentFieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FulfillmentInputGroup = styled.div<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  ${({ $wide }) => $wide ? 'grid-column: 1 / -1;' : ''}
`;

export const FulfillmentLabel = styled.label`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
  font-weight: 700;
`;

export const FulfillmentInput = styled.input`
  width: 100%;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 54%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.75rem 0.875rem;
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
  }
`;

export const FulfillmentTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 54%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.75rem 0.875rem;
  font: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
  }
`;

export const FulfillmentHelperText = styled.p`
  margin: 0.875rem 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent));
  font-size: 0.8rem;
`;
