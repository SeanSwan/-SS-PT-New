/**
 * FILE: AscensionPage.styles.ts
 * PURPOSE: Crystalline Swan page-shell styles for the Ascension tier route.
 * LAST VALIDATED: 2026-06-09 via AscensionPage shell theme contract.
 */
import styled, { keyframes } from 'styled-components';

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
    radial-gradient(circle at 20% 8%, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), transparent 26%),
    radial-gradient(circle at 82% 0%, color-mix(in srgb, var(--wing-purple, #8B5CF6) 16%, transparent), transparent 28%),
    var(--bg-base, #0A0A0F);
  padding: 2rem 1rem 4rem;
  overflow-x: hidden;

  @media (min-width: 768px) {
    padding: 3rem 2rem 5rem;
  }

  @media (min-width: 1024px) {
    padding: 4rem 2rem 6rem;
  }
`;

export const LoadingState = styled.div`
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-size: 1rem;
`;

export const HeroSection = styled.header`
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;

  @media (min-width: 1024px) {
    margin-bottom: 4rem;
  }
`;

export const Eyebrow = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.75rem;
`;

export const Headline = styled.h1`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 700;
  font-size: clamp(2.5rem, 6vw, 4rem);
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 1rem;
  line-height: 1.1;
  letter-spacing: 0;
  background: linear-gradient(
    90deg,
    var(--text-primary, #E0ECF4) 0%,
    var(--accent-primary, #60C0F0) 50%,
    var(--wing-purple, #8B5CF6) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const HeroSub = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  margin: 0;
`;

export const DesktopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  align-items: start;

  & > :nth-child(2) {
    margin-top: -1rem;
  }
`;

export const MissionNote = styled.p`
  text-align: center;
  max-width: 600px;
  margin: 3rem auto 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 42%, transparent));

  @media (min-width: 1024px) {
    margin-top: 4rem;
  }
`;

export const PromoBanner = styled.div`
  max-width: 900px;
  margin: 0 auto 2rem;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--wing-purple, #8B5CF6) 14%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 42%, transparent);
  border-radius: 8px;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const PromoIcon = styled.span`
  flex-shrink: 0;
  color: var(--wing-purple, #8B5CF6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export const PromoContent = styled.div`
  flex: 1;
`;

export const PromoTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.3rem;
`;

export const PromoText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  margin: 0;
  line-height: 1.5;
`;

export const PromoBtn = styled.button`
  min-height: 44px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--bg-base, #0A0A0F);
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  border: 0;
  border-radius: 8px;
  padding: 0.65rem 1.125rem;
  cursor: pointer;
  white-space: nowrap;
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
