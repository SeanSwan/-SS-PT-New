import styled, { css, keyframes } from 'styled-components';
import TypewriterText from '../components/ui-kit/cinematic/TypewriterText';

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #60C0F0);
    outline-offset: 3px;
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.62; }
  50% { opacity: 0.34; }
`;

export const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

export const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  overflow-x: hidden;
`;

export const ContentSection = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1400px;
  width: 92%;
  margin: 0 auto;
  padding: 0 0 5rem;

  @media (max-width: 768px) { width: 94%; }
  @media (max-width: 430px) { width: 96%; padding-bottom: 3rem; }
  @media (max-width: 320px) { width: 98%; padding-bottom: 2.5rem; }
  @media (min-width: 1920px) { max-width: 1600px; }
  @media (min-width: 2560px) { max-width: 2000px; }
  @media (min-width: 3840px) { max-width: 2800px; }
`;

export const HeroTitle = styled(TypewriterText)`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 300;
  letter-spacing: 0;
  background: ${({ theme }) => theme.gradients.primary};
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: ${shimmer} 6s linear infinite;
  ${reducedMotion}
`;

export const HeroSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 0.75rem;
  max-width: 550px;
  line-height: 1.7;
  text-align: center;
`;

export const StickyBar = styled.div`
  position: sticky;
  top: 12px;
  z-index: 100;
  padding: 1rem;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--surface-primary, #003080) 74%, transparent),
    color-mix(in srgb, var(--bg-base, #030712) 88%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 18px;
  box-shadow:
    0 18px 44px color-mix(in srgb, var(--bg-base, #030712) 38%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  margin: -2rem 0 2rem;

  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(16px);
  `}

  @media (max-width: 640px) {
    position: relative;
    top: auto;
    margin-top: -1rem;
  }
`;

export const BarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const SearchGroup = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 12px;
  padding: 0 16px;
  min-height: 48px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border: ${({ theme }) => theme.borders.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring, #60C0F0) 18%, transparent);
  }

  ${reducedMotion}
`;

export const SearchIcon = styled.div`
  color: ${({ theme }) => theme.text.muted};
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

export const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  outline: none;
  min-height: 44px;
  min-width: 0;

  &::placeholder { color: ${({ theme }) => theme.text.muted}; }
  @media (max-width: 430px) { font-size: 16px; }
`;

export const FilterSelect = styled.select`
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 12px;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  padding: 0 16px;
  min-height: 48px;
  min-width: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  text-transform: capitalize;
  ${focusRing}
  ${reducedMotion}

  &:focus { border: ${({ theme }) => theme.borders.focus}; outline: none; }
  option { background: ${({ theme }) => theme.background.elevated}; color: ${({ theme }) => theme.text.primary}; }
`;

export const StatusBanner = styled.div`
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--surface-primary, #003080) 36%, transparent);
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.9rem;
`;

export const SectionHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 8px;

  svg { color: ${({ theme }) => theme.colors.primary}; }
`;

export const ResultCount = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--surface-primary, #003080) 34%, transparent);
  font-size: 0.82rem;
  font-weight: 800;
  margin-bottom: 1rem;
`;

export const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

export const SkeletonCard = styled.div`
  height: 300px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.subtle};
  border-radius: 16px;
  animation: ${pulse} 1.5s ease infinite;
  ${reducedMotion}
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 5rem 1.5rem;
  color: ${({ theme }) => theme.text.muted};
`;

export const EmptyTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  color: ${({ theme }) => theme.text.heading};
  margin: 1rem 0 0.5rem;
`;

export const EmptyText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.muted};
  margin: 0;
`;

export const ExternalVideoLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 1.25rem;
  padding: 0.7rem 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--surface-primary, #003080) 58%, transparent);
  font-weight: 800;
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  ${focusRing}
  ${reducedMotion}

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }
`;