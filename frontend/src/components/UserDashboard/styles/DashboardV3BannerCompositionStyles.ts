import styled, { css } from 'styled-components';

export const BannerTileLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: flex-start;
  gap: 6px;
  padding: 6px;
  z-index: 0;
  pointer-events: none;
`;

export const BannerTileImage = styled.img`
  flex: 0 0 auto;
  width: clamp(72px, calc(132px * var(--banner-image-scale, 1)), 360px);
  height: auto;
  object-fit: contain;
  object-position: center center;
  border-radius: 8px;
  opacity: 0.92;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  user-select: none;
  -webkit-user-drag: none;
`;

export const BannerCollageLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 0.45vw, 10px);
  padding: clamp(6px, 0.7vw, 14px);
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
`;

const collageMediaCss = css`
  width: 100%;
  height: 100%;
  min-width: 0;
  object-fit: contain;
  object-position: var(--banner-object-position, center center);
  transition: object-position 140ms ease;
  border-radius: inherit;
  user-select: none;
  -webkit-user-drag: none;
`;

export const BannerCollageMediaFrame = styled.div`
  flex: var(--banner-collage-grow, 1.35) 1 var(--banner-collage-basis, 202px);
  aspect-ratio: var(--banner-collage-aspect-ratio, 1.35);
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 70%),
    var(--bg-elevated, #10131A);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const BannerCollageImage = styled.img`
  ${collageMediaCss}
`;

export const BannerCollageVideo = styled.video`
  ${collageMediaCss}
`;

export const BannerCollageControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

export const BannerCollageThumbButton = styled.button`
  min-height: 52px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: var(--bg-surface, #141419);
  cursor: pointer;
  overflow: hidden;
  pointer-events: auto;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const collageThumbMediaCss = css`
  display: block;
  width: 100%;
  height: 52px;
  object-fit: cover;
  opacity: 0.86;
  transition: opacity 180ms ease;

  ${BannerCollageThumbButton}:hover & {
    opacity: 0.55;
  }
`;

export const BannerCollageThumb = styled.img`
  ${collageThumbMediaCss}
`;

export const BannerCollageThumbVideo = styled.video`
  ${collageThumbMediaCss}
`;
