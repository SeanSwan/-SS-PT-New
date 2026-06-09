/**
 * FILE: SubscriptionSuccessPage.styles.ts
 * PURPOSE: Crystalline Swan styled-components for subscription checkout confirmation.
 * LAST VALIDATED: 2026-06-09 via SubscriptionSuccessPage theme contract.
 */
import styled, { keyframes } from 'styled-components';

type SuccessTier = 'pro' | 'elite';

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% center;
  }

  100% {
    background-position: 200% center;
  }
`;

export const PageWrapper = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at 16% 18%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 28%),
    radial-gradient(circle at 84% 12%, color-mix(in srgb, var(--wing-purple, #8B5CF6) 16%, transparent), transparent 30%),
    linear-gradient(135deg, var(--bg-base, #0A0A0F), var(--midnight-sapphire, #002060));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
`;

export const SuccessCard = styled.section`
  width: min(100%, 560px);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 96%, transparent), color-mix(in srgb, var(--royal-depth, #003080) 42%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  box-shadow: 0 24px 80px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  padding: clamp(1.5rem, 5vw, 2.75rem);
  text-align: center;
  animation: ${fadeUp} 0.55s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const IconRing = styled.div<{ $tier: SuccessTier }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-base, #0A0A0F);
  background: ${({ $tier }) => ($tier === 'elite'
    ? 'linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0))'
    : 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))')};
  box-shadow: 0 0 38px ${({ $tier }) => ($tier === 'elite'
    ? 'color-mix(in srgb, var(--wing-purple, #8B5CF6) 42%, transparent)'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 38%, transparent)')};
`;

export const TierBadge = styled.span<{ $tier: SuccessTier }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0.25rem 0.875rem;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1rem;
  color: ${({ $tier }) => ($tier === 'elite' ? 'var(--bg-base, #0A0A0F)' : 'var(--accent-gold, #C6A84B)')};
  border: 1px solid ${({ $tier }) => ($tier === 'elite'
    ? 'transparent'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent)')};
  background: ${({ $tier }) => ($tier === 'elite'
    ? 'linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0), var(--text-primary, #E0ECF4))'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)')};
  background-size: 220% auto;
  animation: ${({ $tier }) => ($tier === 'elite' ? shimmer : 'none')} 3.6s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.55rem, 4vw, 2.15rem);
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;
  letter-spacing: 0;
`;

export const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.96rem;
  line-height: 1.65;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  margin: 0 0 2rem;
`;

export const PromoPanel = styled.div`
  border-left: 3px solid var(--wing-purple, #8B5CF6);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--wing-purple, #8B5CF6) 14%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
  );
  border-radius: 8px;
  padding: 1.125rem 1.25rem;
  margin-bottom: 2rem;
  text-align: left;
`;

export const PromoTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.4rem;
`;

export const PromoText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  margin: 0 0 0.85rem;
`;

export const PromoButton = styled.button`
  min-height: 44px;
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--bg-base, #0A0A0F);
  border: 0;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const ActionButton = styled.button`
  min-height: 44px;
  background: linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080));
  color: var(--text-on-accent, #FFFFFF);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  padding: 0.85rem 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 68%, transparent);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const SecondaryLink = styled.button`
  min-height: 44px;
  background: transparent;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  border: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;
