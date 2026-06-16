/**
 * FILE: CheckoutView.navigationStyles.ts
 * PURPOSE: Navigation controls for the mounted paid checkout view.
 * LAST VALIDATED: 2026-06-16 via storefront production smoke touch-target gate.
 */
import styled from 'styled-components';

export const BackButton = styled.button`
  position: absolute;
  top: 1rem;
  left: 1rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 48px;
  min-width: 48px;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font: inherit;
`;
