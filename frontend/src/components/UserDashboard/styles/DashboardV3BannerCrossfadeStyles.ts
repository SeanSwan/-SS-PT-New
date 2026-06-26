/**
 * ============================================================================
 * FILE: DashboardV3BannerCrossfadeStyles.ts
 * PURPOSE: Cinematic crossfade-hero banner layout (M5b, 2026-06-11).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stacked full-image slides that fade through without
 * crop drift. The active index is driven by the media layer (JS interval,
 * adaptive to photo count); these styles own the fade, the legibility scrim,
 * and the progress dots.
 *
 * KEY DECISIONS:
 * - Crossfade via opacity transition on stacked slides (no marquee track —
 *   the loop-seam class of bugs cannot exist here).
 * - Scrim is a Crystalline gradient so overlaid identity/chips stay legible.
 */

import styled, { css } from 'styled-components';


export const BannerCrossfadeLayer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  background: var(--bg-elevated, #10131A);
`;

const crossfadeSlideCss = css<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: var(--banner-object-position, center center);
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 1600ms ease;
  background: transparent;
  user-select: none;
  -webkit-user-drag: none;


  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const BannerCrossfadeImage = styled.img<{ $active: boolean }>`
  ${crossfadeSlideCss}
`;

export const BannerCrossfadeVideo = styled.video<{ $active: boolean }>`
  ${crossfadeSlideCss}
`;

/* Crystalline legibility scrim — deepens toward the bottom where identity
   chips and copy sit. */
export const BannerCrossfadeScrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 18%, transparent) 0%,
    transparent 34%,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent) 100%
  );
`;

/* Workstream O polish: dots moved bottom-CENTER (standard carousel pattern)
   so they never collide with the bottom-right action clusters that hosts
   (Home hero Edit Cover, ObservatoryCoverHero actions) place over the cover. */
export const BannerCrossfadeDots = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: clamp(8px, 1vw, 14px);
  display: flex;
  gap: 6px;
`;

export const BannerCrossfadeDot = styled.span<{ $active: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 28%, transparent)'};
  box-shadow: ${({ $active }) =>
    $active
      ? '0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent)'
      : 'none'};
  transition: background 400ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
