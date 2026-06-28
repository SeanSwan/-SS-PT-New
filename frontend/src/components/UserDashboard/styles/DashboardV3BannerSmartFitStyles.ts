/**
 * Smart-fit cover media styles for whole-photo banner rendering.
 */

import styled from 'styled-components';

export const BannerSmartFitLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 24% 20%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 34%),
    radial-gradient(circle at 82% 24%, color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent), transparent 30%),
    var(--bg-elevated, #10131A);
`;

export const BannerSmartFitBackdrop = styled.img`
  position: absolute;
  inset: -28px;
  width: calc(100% + 56px);
  height: calc(100% + 56px);
  object-fit: cover;
  object-position: var(--banner-object-position, center center);
  filter: blur(22px) saturate(1.24) brightness(0.58);
  transform: scale(1.06);
  opacity: 0.78;
  user-select: none;
  -webkit-user-drag: none;
`;

export const BannerSmartFitImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: var(--banner-object-position, center center);
  transform: translateZ(0) scale(var(--banner-image-scale, 1));
  transform-origin: center center;
  filter: drop-shadow(0 22px 44px color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent));
  transition: object-position 140ms ease, transform 140ms ease;
  z-index: 1;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
