/**
 * FILE: CheckoutButton.styles.ts
 * PURPOSE: Crystalline Swan styled-components for the checkout payment CTA.
 * LAST VALIDATED: 2026-06-09 via CheckoutButton theme contract.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const AmountDisplay = styled(motion.div)`
  text-align: center;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);
  border-radius: 12px;
  margin-bottom: 0.5rem;
`;

export const AmountLabel = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 0.85rem;
  margin: 0 0 0.25rem;
`;

export const AmountValue = styled.h3`
  color: var(--accent-primary, #60C0F0);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 0 10px color-mix(in srgb, var(--wing-purple, #8B5CF6) 50%, transparent);
`;

export const SecurityNote = styled.p`
  text-align: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font-size: 0.8rem;
  margin: 0.5rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;
