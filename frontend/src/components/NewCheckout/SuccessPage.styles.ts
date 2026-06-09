/**
 * FILE: SuccessPage.styles.ts
 * PURPOSE: Crystalline Swan styled-components for the paid checkout success screen.
 * LAST VALIDATED: 2026-06-09 via SuccessPage theme contract and checkout tests.
 */
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const paymentPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 30px color-mix(in srgb, var(--success, #10B981) 28%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 60px color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
    transform: scale(1.02);
  }
`;

const swanSeal = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(2deg) scale(1.06); }
`;

const vaultShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const SuccessContainer = styled(motion.div)`
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 34%),
    linear-gradient(135deg, var(--bg-base, #0A0A0F) 0%, var(--midnight-sapphire, #002060) 50%, var(--bg-surface, #1A1A24) 100%);
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 34%, transparent);
  position: relative;
  overflow: hidden;
  width: min(100% - 2rem, 800px);
  margin: 2rem auto;
  padding: 0;
  animation: ${paymentPulse} 3.6s ease-in-out infinite;

  @media (max-width: 768px) {
    width: calc(100% - 1rem);
    margin: 1rem auto;
    border-radius: 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

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
      var(--success, #10B981),
      var(--accent-primary, #60C0F0)
    );
    background-size: 200% 100%;
    animation: ${vaultShimmer} 4s ease-in-out infinite;
  }
`;

export const SuccessHeader = styled.div`
  padding: 3rem 2rem 2rem;
  text-align: center;
  background: color-mix(in srgb, var(--success, #10B981) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--success, #10B981) 24%, transparent);

  @media (max-width: 768px) {
    padding: 2rem 1rem 1.5rem;
  }
`;

export const SuccessIcon = styled(motion.div)`
  background: linear-gradient(135deg, var(--success, #10B981), var(--accent-primary, #60C0F0));
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  color: var(--text-on-accent, #FFFFFF);
  animation: ${swanSeal} 4s ease-in-out infinite;

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SuccessTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 2.5rem);
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary, #E0ECF4), var(--accent-gold, #C6A84B));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem;
`;

export const SuccessSubtitle = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-size: 1.1rem;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

export const SuccessContent = styled.div`
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

export const OrderDetailsCard = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  padding: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

export const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin: 0 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const DetailItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
`;

export const DetailIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

export const DetailLabel = styled.p`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-size: 0.85rem;
  margin: 0 0 0.25rem;
`;

export const DetailValue = styled.p`
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  overflow-wrap: anywhere;
`;

export const SessionsHighlight = styled(motion.div)`
  background: linear-gradient(135deg, var(--success, #10B981), var(--midnight-sapphire, #002060));
  border-radius: 14px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

export const SessionsTitle = styled.h3`
  color: var(--text-on-accent, #FFFFFF);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

export const SessionsCount = styled.div`
  color: var(--text-on-accent, #FFFFFF);
  font-size: clamp(2.5rem, 9vw, 3rem);
  font-weight: 700;
  margin: 0.5rem 0;
  text-shadow: 0 0 20px color-mix(in srgb, var(--text-on-accent, #FFFFFF) 40%, transparent);
`;

export const SessionsDescription = styled.p`
  color: color-mix(in srgb, var(--text-on-accent, #FFFFFF) 88%, transparent);
  margin: 0;
  font-size: 1rem;
`;

export const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
`;

export const LoadingCard = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  padding: 3rem 2rem;
  text-align: center;
`;

export const ErrorCard = styled(motion.div)`
  background: color-mix(in srgb, var(--danger, #EF4444) 10%, transparent);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--danger, #EF4444) 32%, transparent);
  padding: 2rem;
  text-align: center;
`;

export const StateIcon = styled.div<{ $tone?: 'loading' | 'error' }>`
  color: ${({ $tone }) => ($tone === 'error' ? 'var(--danger, #EF4444)' : 'var(--accent-primary, #60C0F0)')};
  display: flex;
  justify-content: center;
  margin: 0 auto 1rem;
`;

export const StateTitle = styled.h3<{ $tone?: 'loading' | 'error' }>`
  color: ${({ $tone }) => ($tone === 'error' ? 'var(--danger, #EF4444)' : 'var(--accent-primary, #60C0F0)')};
  margin: 0 0 0.5rem;
`;

export const StateText = styled.p`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  margin: 0;
`;

export const StateAction = styled.div`
  margin-top: 2rem;
`;
