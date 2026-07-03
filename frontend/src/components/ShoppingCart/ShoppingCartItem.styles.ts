/**
 * ShoppingCartItem.styles.ts — Crystalline cart line-item styles
 * ===============================================================
 * Scoped styles for ShoppingCartItem.tsx: card surface, session info,
 * price, 44px quantity stepper, and remove control.
 * Tokens-only color; reduced-motion gated hover choreography.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const CartItemContainer = styled(motion.div)`
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent),
    color-mix(in srgb, var(--wing-purple, #8B5CF6) 6%, transparent)
  );
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  padding: 1.25rem 1.25rem 1.25rem 1.5rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--accent-primary, #60C0F0),
      var(--wing-purple, #8B5CF6)
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--wing-purple, #8B5CF6) 32%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--wing-purple, #8B5CF6) 18%, transparent);
    transform: translateY(-2px);

    &::before { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const ItemLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.25rem;
  align-items: flex-start;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const ItemDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1;
  padding-right: 2.5rem;
`;

export const ItemName = styled.h3`
  font-size: 1.15rem;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  line-height: 1.3;
`;

export const ItemDescription = styled.p`
  font-size: 0.95rem;
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  line-height: 1.5;
`;

export const SessionInfo = styled.div`
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
  border-radius: 8px;
  padding: 0.75rem;

  .session-count {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--accent-primary, #60C0F0);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .session-details {
    font-size: 0.85rem;
    color: var(--text-secondary, rgba(224, 236, 244, 0.75));
    margin-top: 0.25rem;

    .hint {
      text-decoration: underline;
      cursor: help;
    }
  }
`;

export const PriceContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  min-width: 130px;

  @media (max-width: 480px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
`;

export const ItemPrice = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  text-align: right;
  line-height: 1.2;

  .unit-price {
    font-size: 0.8rem;
    color: var(--text-muted, rgba(224, 236, 244, 0.6));
    font-weight: 400;
    display: block;
    margin-top: 0.25rem;
  }
`;

export const QuantityControls = styled.div`
  display: flex;
  align-items: center;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  border-radius: 12px;
  padding: 0.2rem;
  gap: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
`;

export const QuantityButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-primary, #E0ECF4);
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.15rem;
  font-weight: 600;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const QuantityValue = styled.span`
  padding: 0 0.6rem;
  color: var(--text-primary, #E0ECF4);
  min-width: 36px;
  text-align: center;
  font-weight: 600;
`;

export const RemoveButton = styled.button`
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  min-width: 44px;
  min-height: 44px;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: color-mix(in srgb, var(--danger, #ff6b6b) 14%, transparent);
    color: var(--danger, #ff6b6b);
  }

  &:focus-visible {
    outline: 2px solid var(--danger, #ff6b6b);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
