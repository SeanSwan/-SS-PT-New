/**
 * cinematic-shared.ts — Shared styled-components for all cinematic variants.
 *
 * Noise overlays, section shells, glass surfaces, magnetic buttons, and
 * dividers parameterized by CinematicTokens.
 */

import styled, { css, keyframes } from 'styled-components';
import type { CinematicTokens } from './cinematic-tokens';

// ─── Token Prop Helper ───────────────────────────────────────────────

interface TokenProps {
  $tokens: CinematicTokens;
}

// ─── Global Noise Overlay ────────────────────────────────────────────
// Rendered once per variant, covers the entire page.

export const NoiseOverlay = styled.div<TokenProps>`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: ${({ $tokens }) => $tokens.surface.noiseOpacity};
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

// ─── Section Shell ───────────────────────────────────────────────────
// Standard section wrapper with consistent padding and max-width.

export const SectionShell = styled.section<TokenProps>`
  position: relative;
  width: 100%;
  padding: 6rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }

  @media (max-width: 430px) {
    padding: 3rem 0.75rem;
  }
`;

// ─── Full-Width Section Background ───────────────────────────────────

export const SectionBackground = styled.div<TokenProps & { $variant?: 'default' | 'surface' | 'accent' }>`
  position: relative;
  width: 100%;
  background: ${({ $tokens, $variant }) => {
    switch ($variant) {
      case 'surface':
        return $tokens.palette.surface;
      case 'accent':
        return `linear-gradient(135deg, ${$tokens.palette.surface} 0%, ${$tokens.palette.bg} 100%)`;
      default:
        return $tokens.palette.bg;
    }
  }};
`;

// ─── Glass Card ──────────────────────────────────────────────────────

export const GlassCard = styled.div<TokenProps>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  box-shadow: ${({ $tokens }) => $tokens.surface.cardShadow};
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
  }
`;

// ─── Magnetic Button ─────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const MagneticButton = styled.button<TokenProps & { $variant?: 'primary' | 'secondary' | 'ghost' }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border: none;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s ease;
  min-height: 44px; /* 44px touch target */
  min-width: 44px;
  text-decoration: none;

  ${({ $tokens, $variant }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background: transparent;
          color: ${$tokens.palette.accent};
          border: 1.5px solid ${$tokens.palette.accent};
          &:hover {
            background: rgba(198, 168, 75, 0.1);
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${$tokens.palette.textPrimary};
          &:hover {
            background: rgba(255, 255, 255, 0.05);
          }
        `;
      default: // primary
        return css`
          background: linear-gradient(135deg, ${$tokens.palette.accent}, ${$tokens.palette.gaming});
          color: ${$tokens.palette.textOnAccent};
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

          &::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
            background-size: 200% 100%;
            animation: ${shimmer} 3s ease-in-out infinite;
            pointer-events: none;
          }
        `;
    }
  }}

  &:hover {
    transform: scale(1.03);
  }

  &:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      animation: none;
    }
    &:hover {
      transform: none;
    }
  }
`;

// ─── Section Heading ─────────────────────────────────────────────────

export const SectionHeading = styled.h2<TokenProps>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: ${({ $tokens }) => $tokens.typography.headingWeight};
  font-size: clamp(2rem, 5vw, 3.5rem);
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 1rem;
`;

// ─── Section Description ─────────────────────────────────────────────

export const SectionDescription = styled.p<TokenProps>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-weight: ${({ $tokens }) => $tokens.typography.bodyWeight};
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.7;
  max-width: 680px;
  margin: 0 0 3rem;
`;

// ─── Drama Text (italic accent) ─────────────────────────────────────

export const DramaText = styled.span<TokenProps>`
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  color: ${({ $tokens }) => $tokens.palette.accent};
`;

// ─── Accent Badge ────────────────────────────────────────────────────

export const AccentBadge = styled.span<TokenProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 1rem;
  border-radius: 2rem;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: ${({ $tokens }) => `linear-gradient(135deg, ${$tokens.palette.accent}20, ${$tokens.palette.gaming}10)`};
  color: ${({ $tokens }) => $tokens.palette.accent};
  border: 1px solid ${({ $tokens }) => $tokens.palette.accent}30;
`;

// ─── Section Divider ─────────────────────────────────────────────────

const mist = keyframes`
  0% { transform: translateX(-5%); opacity: 0.4; }
  50% { transform: translateX(5%); opacity: 0.7; }
  100% { transform: translateX(-5%); opacity: 0.4; }
`;

export const CinematicDivider = styled.div<TokenProps>`
  position: relative;
  height: 80px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 120%;
    height: 100%;
    left: -10%;
    background: radial-gradient(
        ellipse at 30% 50%,
        ${({ $tokens }) => $tokens.palette.gaming}08 0%,
        transparent 50%
      ),
      radial-gradient(
        ellipse at 70% 50%,
        ${({ $tokens }) => $tokens.palette.accent}06 0%,
        transparent 50%
      );
    animation: ${mist} 12s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ $tokens }) => $tokens.palette.gaming}30,
      ${({ $tokens }) => $tokens.palette.accent}20,
      transparent
    );
  }

  @media (max-width: 768px) {
    height: 50px;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

// ─── Icon Container ──────────────────────────────────────────────────

export const IconContainer = styled.div<TokenProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  background: ${({ $tokens }) => `linear-gradient(135deg, ${$tokens.palette.accent}15, ${$tokens.palette.gaming}10)`};
  color: ${({ $tokens }) => $tokens.palette.accent};
  flex-shrink: 0;
`;

// ─── Grid Layouts ────────────────────────────────────────────────────

export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const Grid4 = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;
