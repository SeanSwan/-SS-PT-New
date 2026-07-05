/**
 * ShoppingCart.styles.ts — Crystalline Swan cart modal chrome
 * ============================================================
 * Modal frame and header/body/footer chrome for the canonical
 * header-mounted cart modal (rendered by Header/header.tsx).
 * Summary/state styles: ShoppingCart.summaryStyles.ts.
 * Item-card styles: ShoppingCartItem.styles.ts.
 *
 * Design contract (theme-contract tested):
 * - Tokens-only color via var(--token, #fallback) — Crystalline palette
 * - prefers-reduced-motion disables all looping/hover motion
 * - 44px minimum interactive targets
 */
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

export const floatSoft = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
`;

export const CartModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  @media (max-width: 768px) {
    align-items: flex-end;
    padding: 0;
  }
`;

export const CartModalContent = styled(motion.div)`
  background: linear-gradient(
    160deg,
    var(--bg-surface, #1A1A24) 0%,
    var(--midnight-sapphire, #002060) 100%
  );
  width: 100%;
  max-width: 520px;
  border-radius: 20px 20px 0 0;
  box-shadow:
    0 20px 60px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent),
    0 0 40px color-mix(in srgb, var(--wing-purple, #8B5CF6) 35%, transparent);
  position: relative;
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);

  /* Signature chrome edge: Ice Wing -> Wing Purple beam across the top */
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
    z-index: 11;
  }

  @media (min-width: 769px) {
    border-radius: 20px;
    max-height: 85vh;
    width: 90%;
  }

  @media (max-width: 768px) {
    max-height: 85vh;
  }
`;

export const CartHeader = styled(motion.div)`
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
  padding: 1.5rem 2rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
`;

export const CartTitle = styled.h2`
  font-size: 1.6rem;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #E0ECF4);

  > svg {
    color: var(--accent-primary, #60C0F0);
    flex-shrink: 0;
  }

  .title-text {
    background: linear-gradient(
      135deg,
      var(--accent-primary, #60C0F0),
      var(--text-primary, #E0ECF4)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

export const ModalCloseButton = styled.button`
  position: absolute;
  top: 0.9rem;
  right: 1.25rem;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent);
  border-radius: 50%;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
    border-color: color-mix(in srgb, var(--wing-purple, #8B5CF6) 40%, transparent);
    color: var(--accent-primary, #60C0F0);
    transform: rotate(90deg);
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const CartBody = styled.div`
  max-height: calc(85vh - 150px);
  overflow-y: auto;
  padding: 0 2rem;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(
      135deg,
      var(--accent-primary, #60C0F0),
      var(--wing-purple, #8B5CF6)
    );
    border-radius: 3px;
  }
`;

export const CartFooter = styled(motion.div)`
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 6%, transparent);
  padding: 1.5rem 2rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  position: sticky;
  bottom: 0;
  backdrop-filter: blur(10px);
`;

export const CartItemsList = styled.div`
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const EmptyCartMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));

  .empty-icon {
    display: inline-flex;
    margin-bottom: 1rem;
    color: var(--accent-primary, #60C0F0);
    opacity: 0.55;
    animation: ${css`${floatSoft}`} 4s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #E0ECF4);
  }

  p {
    margin-bottom: 2rem;
    font-size: 1.05rem;
    line-height: 1.6;
  }
`;
