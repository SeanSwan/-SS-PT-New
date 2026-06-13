/**
 * Structural layout styles for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const NoiseOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

export const MainContentZWrapper = styled.div`
  position: relative;
  z-index: 2;
`;

// SECTION: Layout Components
// PURPOSE: Primary containers, grids, and structural wrappers

export const ProfileContainer = styled(motion.div)`
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  position: relative;
  /* 2026-05-10 SLICE 1 (Codex round-3 HIGH): keep horizontal clipping so the
     ProfileHeader margin-left full-bleed trick can't
     trigger horizontal scroll, but drop vertical overflow so the descendant
     TabNavigation's position: sticky pins to the viewport instead of being
     constrained by this ancestor's containing block. */
  overflow-x: hidden;

  /* Subtle background pattern for premium feel */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--accent-gold, #C6A84B) 5%, transparent) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

export const ContentWrapper = styled.div<{ $belowCover?: boolean }>`
  position: relative;
  z-index: 1;
  max-width: 1440px;
  margin: 0 auto;
  padding: 3rem 2rem;

  /* Workstream O: when the full-width cover hero sits directly above, the
     page rhythm tightens — one small gap instead of the old 3rem-plus stack
     of banner margins and rail clearances. */
  ${({ $belowCover }) => $belowCover && 'padding-top: 1.25rem;'}

  @media (max-width: 1024px) {
    max-width: 100%;
    padding: 2rem 1.5rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 1rem;'}
  }

  /* O3: phones carry the fixed bottom nav bar — clear it (+ iOS safe area)
     so the last content row is never buried under the bar. */
  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
    padding-bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
    ${({ $belowCover }) => $belowCover && 'padding-top: 0.85rem;'}
  }

  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
    padding-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    ${({ $belowCover }) => $belowCover && 'padding-top: 0.75rem;'}
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.75rem 0.5rem;
    padding-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    ${({ $belowCover }) => $belowCover && 'padding-top: 0.6rem;'}
  }

  @media (min-width: 1920px) {
    max-width: 1760px;
    padding: 3.5rem 2.5rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 1.5rem;'}
  }

  @media (min-width: 2560px) {
    max-width: 2360px;
    padding: 4rem 3rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 1.75rem;'}
  }

  @media (min-width: 3840px) {
    max-width: 3440px;
    padding: 5rem 4rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 2rem;'}
  }
`;

export const ContentGrid = styled.div<{ $fullWidth?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $fullWidth }) => $fullWidth ? '1fr' : '300px 1fr'};
  gap: 2rem;
  margin-top: ${({ $fullWidth }) => $fullWidth ? '1rem' : '2rem'};
  /* 2026-05-10 SLICE 1: removed overflow: hidden so the sticky tab strip
     above ContentGrid can pin to the viewport without being clipped to
     ContentGrid's box. The retired clip wasn't load-bearing here —
     ProfileContainer/ContentWrapper still clip the page horizontally. */

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (min-width: 1920px) {
    grid-template-columns: ${({ $fullWidth }) => $fullWidth ? '1fr' : '340px 1fr'};
    gap: 2.25rem;
    margin-top: 2.5rem;
  }

  @media (min-width: 2560px) {
    grid-template-columns: ${({ $fullWidth }) => $fullWidth ? '1fr' : '420px 1fr'};
    gap: 2.5rem;
    margin-top: 3rem;
  }

  @media (min-width: 3840px) {
    grid-template-columns: ${({ $fullWidth }) => $fullWidth ? '1fr' : '520px 1fr'};
    gap: 3rem;
    margin-top: 4rem;
  }
`;


export const TabStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

// SECTION: Profile Header Components
// PURPOSE: Cover photo, profile image, and header info area
