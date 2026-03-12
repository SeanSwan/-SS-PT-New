/**
 * GildedButton — Gold luxury CTA for commerce actions (Print-on-Demand checkout)
 * Gilded Fern #C6A84B on Midnight Sapphire · 56px premium touch target
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const GildedButton = styled(motion.button)`
  width: 100%;
  height: 56px;
  background: #C6A84B; /* Gilded Fern */
  color: #002060; /* Midnight Sapphire */
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(198, 168, 75, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(198, 168, 75, 0.5);
    background: #D4B85C;
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid #C6A84B;
    outline-offset: 2px;
  }
`;
