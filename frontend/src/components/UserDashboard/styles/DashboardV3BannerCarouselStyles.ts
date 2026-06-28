import styled, { css, keyframes } from 'styled-components';

const carouselTrack = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

export const BannerCarouselTrack = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: clamp(6px, 0.65vw, 14px);
  /* Seamless loop fix (2026-06-11): the track is a duplicated [photos,photos]
     run sized to its content. The old min-width:200% STRETCHED the track when
     content was narrower than 2x the frame, so the translateX(-50%) reset no
     longer landed on the seam -> a visible jump every loop. width:max-content
     alone keeps the two halves identical, so -50% always hits the seam. */
  width: max-content;
  /* Full-bleed fill (Slice 1, 2026-06-13): full cover height so the frames'
     height:100% resolves against a definite base (was height:auto, which sized
     to the short frames and left dead padding bands). Width stays max-content so
     the M5a -50% loop seam is unaffected. */
  height: 100%;
  max-height: 100%;
  /* Adaptive speed: duration scales with photo count via a CSS var set by the
     media layer (more photos -> longer track -> longer duration -> steady px/s). */
  animation: ${carouselTrack} var(--banner-carousel-duration, 38s) linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
  /* will-change only while motion is allowed — avoids a permanent composited
     layer (GPU memory) when the user prefers reduced motion. */
  @media (prefers-reduced-motion: no-preference) {
    will-change: transform;
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
  /* Same seamless-loop fix as BannerCarouselTrack — drop min-width:200%. */
  width: max-content;
  height: 100%;
  animation: ${carouselTrack} var(--banner-carousel-duration, 34s) linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    will-change: transform;
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
  /* Cover-fill (2026-06-11): was object-fit:contain, which letterboxed every
     photo with pillarbox bars. cover fills the frame edge-to-edge. */
  object-fit: cover;
  object-position: center;
  background: var(--bg-base, #0A0A0F);
`;

export const BannerStickyCarouselImage = styled.img`
  ${stickyCarouselMediaCss}
`;

export const BannerStickyCarouselVideo = styled.video`
  ${stickyCarouselMediaCss}
`;
