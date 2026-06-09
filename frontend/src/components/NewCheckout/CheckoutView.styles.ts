/**
 * FILE: CheckoutView.styles.ts
 * PURPOSE: Crystalline Swan styled-components for the live paid checkout route.
 * LAST VALIDATED: 2026-06-09 via CheckoutView theme contract.
 */
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const checkoutPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 24px color-mix(in srgb, var(--wing-purple, #8B5CF6) 24%, transparent);
  }
  50% {
    box-shadow: 0 0 44px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }
`;

const frostShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const swanFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

export const CheckoutContainer = styled(motion.div)`
  background:
    radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), transparent 32%),
    linear-gradient(135deg, var(--bg-base, #0A0A0F) 0%, var(--midnight-sapphire, #002060) 52%, var(--bg-surface, #1A1A24) 100%);
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);
  position: relative;
  overflow: hidden;
  width: min(95%, 1400px);
  margin: 2rem auto;
  padding: 0;
  min-height: 600px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      var(--accent-primary, #60C0F0),
      var(--accent-gold, #C6A84B),
      var(--accent-primary, #60C0F0)
    );
    background-size: 200% 100%;
    animation: ${frostShimmer} 3s linear infinite;
  }

  @media (max-width: 768px) {
    width: calc(100% - 1rem);
    margin: 0.5rem auto;
    border-radius: 14px;
    min-height: auto;
    max-height: 90vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

export const CheckoutHeader = styled.div`
  padding: 2rem;
  text-align: center;
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 22%, transparent);

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }
`;

export const BackButton = styled.button`
  position: absolute;
  top: 1rem;
  left: 1rem;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font: inherit;
`;

export const CheckoutTitle = styled.h1`
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem;
  animation: ${swanFloat} 4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CheckoutSubtitle = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  font-size: 1.1rem;
  margin: 0;
`;

export const CheckoutContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  padding: 2rem 3rem;
  min-height: 500px;

  @media (max-width: 1200px) {
    grid-template-columns: 1.5fr 1fr;
    gap: 2rem;
    padding: 2rem;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 350px;
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

export const MainSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const SecurityBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
`;

export const SecurityBadge = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 30%, transparent);
  border-radius: 8px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-size: 0.85rem;

  svg {
    color: var(--accent-primary, #60C0F0);
  }
`;

export const CheckoutSection = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 22%, transparent);
  padding: 2rem;

  @media (max-width: 1024px) {
    padding: 1.75rem;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1.25rem;
  }
`;

export const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const CheckoutInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
`;

export const InfoCard = styled.div`
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.25rem;
  text-align: center;
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
  border-radius: 12px;
`;

export const InfoCardIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

export const InfoCardTitle = styled.h4`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
`;

export const InfoCardValue = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent));
  font-size: 0.8rem;
  margin: 0;
  overflow-wrap: anywhere;
`;

export const ErrorMessage = styled(motion.div)`
  background: color-mix(in srgb, var(--danger, #EF4444) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #EF4444) 30%, transparent);
  border-radius: 12px;
  padding: 1rem;
  color: var(--danger, #EF4444);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const SuccessMessage = styled(motion.div)`
  background: color-mix(in srgb, var(--success, #10B981) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 30%, transparent);
  border-radius: 12px;
  padding: 1rem;
  color: var(--success, #10B981);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  animation: ${checkoutPulse} 3s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ActionButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;
