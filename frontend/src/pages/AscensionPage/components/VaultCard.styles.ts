/**
 * FILE: VaultCard.styles.ts
 * PURPOSE: Crystalline Swan visual contract for canonical Ascension tier cards.
 * LAST VALIDATED: 2026-06-09 via VaultCard theme contract and Ascension visual smoke.
 */
import styled, { css, keyframes } from 'styled-components';
export type VaultCardVariant = 'starter' | 'guardian' | 'crystalline';
const breathe = keyframes`
  0%,
  100% {
    opacity: 0.62;
    box-shadow: 0 0 14px color-mix(in srgb, var(--wing-purple, #8B5CF6) 26%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  }
`;
const accentFor = ($variant: VaultCardVariant) => {
  if ($variant === 'crystalline') return 'var(--accent-primary, #60C0F0)';
  if ($variant === 'guardian') return 'var(--gilded-fern, #C6A84B)';
  return 'var(--text-primary, #E0ECF4)';
};
const softText = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent))';
const mutedText = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent))';
const cardTone = ($variant: VaultCardVariant) => {
  if ($variant === 'starter') {
    return css`
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--card-bg, #141419) 92%, transparent), var(--card-bg, #141419)),
        var(--card-bg, #141419);
      border: 1px solid var(--border-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent));
    `;
  }
  if ($variant === 'guardian') {
    return css`
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--card-bg, #141419) 86%, var(--gilded-fern, #C6A84B) 14%),
          color-mix(in srgb, var(--primary, #002060) 76%, var(--bg-base, #0A0A0F) 24%)
        );
      border: 1px solid color-mix(in srgb, var(--gilded-fern, #C6A84B) 46%, transparent);
    `;
  }
  return css`
    background:
      linear-gradient(
        145deg,
        color-mix(in srgb, var(--wing-purple, #8B5CF6) 72%, var(--primary, #002060) 28%),
        color-mix(in srgb, var(--accent-primary, #60C0F0) 62%, var(--primary, #002060) 38%)
      );
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
    box-shadow: 0 22px 42px color-mix(in srgb, var(--wing-purple, #8B5CF6) 20%, transparent);
  `;
};
const buttonTone = ($variant: VaultCardVariant) => {
  if ($variant === 'starter') {
    return css`
      background: color-mix(in srgb, var(--card-bg, #141419) 72%, var(--text-primary, #E0ECF4) 10%);
      color: var(--text-primary, #E0ECF4);
      &:hover {
        background: color-mix(in srgb, var(--card-bg, #141419) 62%, var(--text-primary, #E0ECF4) 16%);
      }
    `;
  }
  if ($variant === 'guardian') {
    return css`
      background: var(--primary, #002060);
      color: var(--text-primary, #E0ECF4);
      &:hover {
        box-shadow: 0 0 20px color-mix(in srgb, var(--wing-purple, #8B5CF6) 44%, transparent);
        transform: translateY(-2px);
      }
    `;
  }
  return css`
    min-height: 56px;
    background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0));
    color: var(--bg-base, #0A0A0F);
    font-size: 1.05rem;
    &:hover {
      box-shadow: 0 0 25px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
      transform: translateY(-2px);
    }
  `;
};
export const Card = styled.div<{ $variant: VaultCardVariant }>`
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  height: auto;
  min-height: 0;
  flex-direction: column;
  padding: clamp(1.5rem, 3.2vw, 2rem);
  overflow: visible;
  border-radius: 8px;
  isolation: isolate;
  ${({ $variant }) => cardTone($variant)}
  @media (min-width: 1024px) {
    min-height: ${({ $variant }) => $variant === 'guardian' ? '42rem' : '35rem'};
  }
`;
export const CrystallineBorder = styled.div`
  position: absolute;
  inset: -2px;
  z-index: -1;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0));
  animation: ${breathe} 4s ease-in-out infinite;
  pointer-events: none;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.82;
  }
`;
export const TierName = styled.h2<{ $variant: VaultCardVariant }>`
  margin: 0 0 0.25rem;
  color: ${({ $variant }) => accentFor($variant)};
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.75rem, 3vw, 2rem);
  font-style: italic;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0;
`;
export const Tagline = styled.p`
  margin: 0 0 1.35rem;
  color: ${softText};
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.45;
`;
export const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;
export const Price = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(2.55rem, 5.2vw, 3.35rem);
  font-weight: 850;
  line-height: 1;
  letter-spacing: 0;
`;
export const Period = styled.span`
  color: ${mutedText};
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.2;
`;
export const BillingToggle = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.1rem;
  padding: 0.25rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
`;
export const BillingOption = styled.button<{ $active: boolean }>`
  display: flex;
  flex: 1;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) => $active ? 'var(--wing-purple, #8B5CF6)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--bg-base, #0A0A0F)' : mutedText};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
export const SaveBadge = styled.span`
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background: var(--gilded-fern, #C6A84B);
  color: var(--bg-base, #0A0A0F);
  font-size: 0.65rem;
  font-weight: 800;
`;
export const FeatureList = styled.ul`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.7rem;
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
`;
export const FeatureItem = styled.li<{ $variant: VaultCardVariant }>`
  display: flex;
  min-height: 28px;
  align-items: flex-start;
  gap: 0.65rem;
  color: ${softText};
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  line-height: 1.42;
`;
export const CheckIcon = styled.span<{ $variant: VaultCardVariant }>`
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 0.15rem;
  color: ${({ $variant }) => $variant === 'starter' ? mutedText : accentFor($variant)};
`;
export const CTAArea = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0;
  padding-top: 1.5rem;
  @media (max-width: 767px) {
    padding-top: 1.25rem;
  }
`;
export const CTAButton = styled.button<{ $variant: VaultCardVariant }>`
  min-height: 48px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  transition: background 0.2s ease, box-shadow 0.25s ease, transform 0.25s ease;
  ${({ $variant }) => buttonTone($variant)}
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;
export const TrialButton = styled.button`
  min-height: 44px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;
export const CurrentPlanBadge = styled.div`
  width: 100%;
  min-height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  text-align: center;
`;
