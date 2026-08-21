/**
 * Structural layout styles for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled, { css } from 'styled-components';
import type { DashboardBackgroundStyle } from '../backgrounds/UserDashboardBackgrounds';
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

export const ProfileContainer = styled(motion.div)<{ $backgroundStyle?: DashboardBackgroundStyle }>`
  ${({ $backgroundStyle }) => $backgroundStyle && css`
    --user-dashboard-bg-base: ${$backgroundStyle['--user-dashboard-bg-base']};
    --user-dashboard-bg-base-size: ${$backgroundStyle['--user-dashboard-bg-base-size']};
    --user-dashboard-bg-base-position: ${$backgroundStyle['--user-dashboard-bg-base-position']};
    --user-dashboard-bg-base-repeat: ${$backgroundStyle['--user-dashboard-bg-base-repeat']};
    --user-dashboard-bg-art: ${$backgroundStyle['--user-dashboard-bg-art']};
    --user-dashboard-bg-mark-image: ${$backgroundStyle['--user-dashboard-bg-mark-image']};
    --user-dashboard-bg-mark-opacity: ${$backgroundStyle['--user-dashboard-bg-mark-opacity']};
    --user-dashboard-bg-mark-position: ${$backgroundStyle['--user-dashboard-bg-mark-position']};
    --user-dashboard-bg-mark-size: ${$backgroundStyle['--user-dashboard-bg-mark-size']};
    --user-dashboard-bg-mark-blur: ${$backgroundStyle['--user-dashboard-bg-mark-blur']};
  `}
  min-height: 100vh;
  background: var(--user-dashboard-bg-base, var(--bg-base));
  background-size: var(--user-dashboard-bg-base-size, auto);
  background-position: var(--user-dashboard-bg-base-position, center);
  background-repeat: var(--user-dashboard-bg-base-repeat, no-repeat);
  color: var(--text-primary);
  position: relative;
  /* 2026-05-10 SLICE 1 (Codex round-3 HIGH): keep horizontal clipping so the
     ProfileHeader margin-left full-bleed trick can't
     trigger horizontal scroll, but drop vertical overflow so the descendant
     TabNavigation's position: sticky pins to the viewport instead of being
     constrained by this ancestor's containing block. */
  overflow-x: hidden;

  /* Token-driven dashboard background art. Recipes inherit the active theme
     variables; custom photos stay darkened so cards and text keep contrast. */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: var(--user-dashboard-bg-art,
      radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--accent-gold, #C6A84B) 5%, transparent) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 0%, transparent 50%));
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: var(--user-dashboard-bg-mark-image, none);
    background-position: var(--user-dashboard-bg-mark-position, center);
    background-size: var(--user-dashboard-bg-mark-size, min(68vw, 900px));
    background-repeat: no-repeat;
    opacity: var(--user-dashboard-bg-mark-opacity, 0.06);
    filter: blur(var(--user-dashboard-bg-mark-blur, 0px)) saturate(1.15);
    mix-blend-mode: screen;
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
     page rhythm tightens - one small gap instead of the old 3rem-plus stack
     of banner margins and rail clearances. */
  ${({ $belowCover }) => $belowCover && 'padding-top: 1.25rem;'}

  @media (max-width: 1024px) {
    max-width: 100%;
    padding: 2rem 1.5rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 1rem;'}
  }

  /* O3: phones carry the fixed bottom nav bar - clear it (+ iOS safe area)
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

  @media (min-width: 3200px) {
    max-width: 3040px;
    padding: 4.5rem 3.5rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 1.9rem;'}
  }
  @media (min-width: 3840px) {
    max-width: 3440px;
    padding: 5rem 4rem;
    ${({ $belowCover }) => $belowCover && 'padding-top: 2rem;'}
  }
`;

/**
 * The profile rail is OPT-IN (`$withSidebar`), not opt-out.
 *
 * It used to be opt-out (`$fullWidth`), which meant every tab got a fixed 300px
 * rail unless it remembered to say otherwise — including Home, whose own
 * CreatorShell already lays out three rails of its own. Two nested rail systems
 * left the actual content column badly squeezed at laptop widths.
 *
 * The default is inverted deliberately: the two failure modes are not
 * symmetric. A tab that is accidentally full-width still reads fine; a tab that
 * is accidentally crushed is the bug this replaced. New tabs are safe by
 * omission.
 */
export const ContentGrid = styled.div<{ $withSidebar?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $withSidebar }) => $withSidebar ? '300px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  gap: 2rem;
  min-width: 0;
  width: 100%;
  margin-top: ${({ $withSidebar }) => $withSidebar ? '2rem' : '1rem'};
  /* 2026-05-10 SLICE 1: removed overflow: hidden so the sticky tab strip
     above ContentGrid can pin to the viewport without being clipped to
     ContentGrid's box. The retired clip wasn't load-bearing here -
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
    grid-template-columns: ${({ $withSidebar }) => $withSidebar ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
    gap: 2.25rem;
    margin-top: 2.5rem;
  }

  @media (min-width: 2560px) {
    grid-template-columns: ${({ $withSidebar }) => $withSidebar ? '420px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
    gap: 2.5rem;
    margin-top: 3rem;
  }

  @media (min-width: 3840px) {
    grid-template-columns: ${({ $withSidebar }) => $withSidebar ? '520px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
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
