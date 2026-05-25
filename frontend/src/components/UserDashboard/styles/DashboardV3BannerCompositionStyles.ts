import styled, { css } from 'styled-components';

export const BannerTileLayer = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(150px, calc(180px * var(--banner-image-scale, 1)), 360px), 1fr));
  grid-auto-rows: clamp(118px, calc(138px * var(--banner-image-scale, 1)), 260px);
  gap: 6px;
  padding: 6px;
  align-content: start;
  z-index: 0;
  pointer-events: none;
`;

export const BannerTileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  border-radius: 8px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), transparent 68%),
    var(--bg-elevated, #10131A);
  opacity: 0.92;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  user-select: none;
  -webkit-user-drag: none;
`;

export const BannerCollageLayer = styled.div<{ $count?: number }>`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: ${({ $count }) => {
    if ($count === 1) return '1fr';
    if ($count === 2) return 'repeat(2, 1fr)';
    return '1.35fr repeat(2, 1fr)';
  }};
  grid-template-rows: repeat(2, 1fr);
  gap: clamp(4px, 0.45vw, 10px);
  padding: clamp(6px, 0.7vw, 14px);
  z-index: 0;
  pointer-events: none;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const collageMediaCss = css<{ $feature?: boolean }>`
  width: 100%;
  height: 100%;
  min-width: 0;
  object-fit: contain;
  object-position: center center;
  border-radius: 8px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 70%),
    var(--bg-elevated, #10131A);
  transform: translateZ(0);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  grid-row: ${({ $feature }) => ($feature ? '1 / -1' : 'auto')};
  user-select: none;
  -webkit-user-drag: none;

  @media (max-width: 640px) {
    grid-row: auto;
  }
`;

export const BannerCollageImage = styled.img<{ $feature?: boolean }>`
  ${collageMediaCss}
`;

export const BannerCollageVideo = styled.video<{ $feature?: boolean }>`
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
