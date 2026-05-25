import styled, { css, keyframes } from 'styled-components';

const carouselTrack = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

export const BannerCarouselTrack = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: clamp(6px, 0.65vw, 14px);
  width: max-content;
  min-width: 200%;
  height: 100%;
  animation: ${carouselTrack} 38s linear infinite;
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`;

export const BannerStickyCarouselLayer = styled.div`
  position: fixed;
  top: clamp(52px, 5.5vh, 66px);
  left: 0;
  right: 0;
  z-index: 40;
  height: clamp(34px, calc(var(--banner-frame-height, 320px) * 0.12), 72px);
  padding: 4px clamp(8px, 1vw, 18px);
  overflow: hidden;
  pointer-events: none;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 68%, transparent);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);

  @media (max-width: 768px) {
    top: 54px;
    height: clamp(30px, 7vw, 44px);
    padding: 3px 6px;
  }
`;

export const BannerStickyCarouselTrack = styled.div`
  display: flex;
  gap: 6px;
  width: max-content;
  min-width: 200%;
  height: 100%;
  animation: ${carouselTrack} 34s linear infinite;
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`;

export const BannerStickyCarouselFrame = styled.div`
  flex: 0 0 clamp(72px, 14vw, 190px);
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-elevated, #10131A);
`;

const stickyCarouselMediaCss = css`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
`;

export const BannerStickyCarouselImage = styled.img`
  ${stickyCarouselMediaCss}
`;

export const BannerStickyCarouselVideo = styled.video`
  ${stickyCarouselMediaCss}
`;
