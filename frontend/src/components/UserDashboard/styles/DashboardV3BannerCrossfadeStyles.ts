/**
 * ============================================================================
 * FILE: DashboardV3BannerCrossfadeStyles.ts
 * PURPOSE: Cinematic crossfade-hero banner layout (M5b, 2026-06-11).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stacked full-bleed slides that fade through with a slow
 * Ken-Burns drift — the modern flagship-app cover. The active index is driven
 * by the media layer (JS interval, adaptive to photo count); these styles own
 * the fade, the drift, the legibility scrim, and the progress dots.
 *
 * KEY DECISIONS:
 * - Crossfade via opacity transition on stacked slides (no marquee track —
 *   the loop-seam class of bugs cannot exist here).
 * - Ken-Burns drift only on the ACTIVE slide, killed by prefers-reduced-motion
 *   (reduced-motion users get a clean static photo).
 * - Rule 43: the keyframes object is interpolated inside a css`` block.
 * - Scrim is a Crystalline gradient so overlaid identity/chips stay legible.
 */

import styled, { css, keyframes } from 'styled-components';

const kenBurns = keyframes`
  from { transform: scale(1) translate3d(0, 0, 0); }
  to { transform: scale(1.07) translate3d(-1.2%, -1%, 0); }
`;

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
  object-fit: cover;
  object-position: var(--banner-object-position, center center);
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 1600ms ease;
  user-select: none;
  -webkit-user-drag: none;

  @media (prefers-reduced-motion: no-preference) {
    ${({ $active }) =>
      $active &&
      css`
        animation: ${kenBurns} 8s ease-out forwards;
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
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

export const BannerCrossfadeDots = styled.div`
  position: absolute;
  right: clamp(10px, 1.2vw, 18px);
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
