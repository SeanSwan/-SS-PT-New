/**
 * FILE: CheckoutCancel.styles.ts
 * PURPOSE: Crystalline Swan styled-components for the checkout recovery page.
 * LAST VALIDATED: 2026-06-09 via CheckoutCancel theme contract.
 */
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const recoveryPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 22px color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  }
  50% {
    box-shadow: 0 0 34px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }
`;

export const CancelPageContainer = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), transparent 30%),
    linear-gradient(135deg, var(--bg-base, #0A0A0F), var(--midnight-sapphire, #002060));
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(2px 2px at 20px 30px, color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent), transparent),
      radial-gradient(1px 1px at 90px 40px, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent), transparent),
      radial-gradient(1px 1px at 130px 80px, color-mix(in srgb, var(--accent-gold, #C6A84B) 58%, transparent), transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.12;
    pointer-events: none;
    z-index: 1;
  }
`;

export const LogoContainer = styled(motion.div)`
  position: relative;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent));
  margin-bottom: 2rem;
  z-index: 2;

  img {
    height: 120px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ContentContainer = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 720px;
`;

export const CancelCard = styled(motion.div)`
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  border-radius: 18px;
  padding: 2.5rem;
  position: relative;
  overflow: hidden;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      45deg,
      transparent 30%,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent) 50%,
      transparent 70%
    );
    background-size: 200% 200%;
    animation: ${shimmer} 4s ease-in-out infinite;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    padding: 1.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

export const CancelContent = styled.div`
  position: relative;
  z-index: 1;
`;

export const CancelIcon = styled(motion.div)`
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-base, #0A0A0F);
  animation: ${recoveryPulse} 3s infinite ease-in-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CancelTitle = styled.h1`
  font-size: clamp(1.6rem, 5vw, 2rem);
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0), var(--text-primary, #E0ECF4));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem;
`;

export const CancelSubtitle = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-size: 1.1rem;
  margin: 0 0 1rem;
  line-height: 1.6;
`;

export const CancelMessage = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 1rem;
  margin: 0 0 2rem;
  line-height: 1.5;
`;

export const OrderSummaryMotion = styled(motion.div)``;

export const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const ActionCard = styled(motion.button)`
  min-height: 44px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 62%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font: inherit;

  &:hover {
    background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent);
    transform: translateY(-5px);
  }
`;

export const ActionIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 1rem;
`;

export const ActionTitle = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

export const ActionDescription = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
`;

export const PrimaryActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

export const ActionButton = styled(motion.button)<{ $variant: 'primary' | 'secondary' }>`
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: ${({ $variant }) => ($variant === 'primary' ? 'none' : '1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 30%, transparent)')};
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  background: ${({ $variant }) => ($variant === 'primary'
    ? 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--wing-purple, #8B5CF6))'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)')};
  color: ${({ $variant }) => ($variant === 'primary' ? 'var(--text-on-accent, #FFFFFF)' : 'var(--text-primary, #E0ECF4)')};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const HelpSection = styled(motion.div)`
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  text-align: center;
`;

export const HelpTitle = styled.h3`
  color: var(--accent-gold, #C6A84B);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

export const HelpText = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
`;
