import type { CSSProperties } from 'react';
import type { BannerObjectFit, BannerObjectPosition } from '../../../services/profileService';

export const TILE_REPEAT_COUNT = 360;
export const DEFAULT_BANNER_COLLAGE_ASPECT_RATIO = 1.35;

export const FIT_LABELS: Record<BannerObjectFit, string> = {
  cover: 'Crop',
  contain: 'Fit whole',
  fill: 'Stretch',
  tile: 'Tile',
  collage: 'Collage',
};

const POSITION_PATTERN = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;
const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov)(?:[?#].*)?$/i;

const COLLAGE_MIN_ASPECT_RATIO = 0.45;
const COLLAGE_MAX_ASPECT_RATIO = 3.4;
const COLLAGE_BASE_BASIS = 150;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatPercent = (value: number) => `${Number(value.toFixed(2))}%`;
const formatRatio = (value: number) => Number(value.toFixed(3)).toString();

export const parseBannerPosition = (position: BannerObjectPosition) => {
  const match = position.match(POSITION_PATTERN);
  return {
    x: match ? Number(match[1]) : 50,
    y: match ? Number(match[2]) : 50,
  };
};

export const formatBannerPosition = (x: number, y: number): BannerObjectPosition =>
  `${formatPercent(clampPercent(x))} ${formatPercent(clampPercent(y))}`;

export const isBannerVideoUrl = (url: string) => VIDEO_EXTENSION_PATTERN.test(url);

export const normalizeBannerMediaAspectRatio = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_BANNER_COLLAGE_ASPECT_RATIO;
  }
  return clampNumber(width / height, COLLAGE_MIN_ASPECT_RATIO, COLLAGE_MAX_ASPECT_RATIO);
};

export const buildBannerCollageFrameStyle = (
  aspectRatio = DEFAULT_BANNER_COLLAGE_ASPECT_RATIO,
  scale = 1,
) => {
  const ratio = clampNumber(aspectRatio, COLLAGE_MIN_ASPECT_RATIO, COLLAGE_MAX_ASPECT_RATIO);
  const basis = Math.round(COLLAGE_BASE_BASIS * clampNumber(scale, 0.5, 3) * ratio);
  return {
    '--banner-collage-aspect-ratio': formatRatio(ratio),
    '--banner-collage-grow': formatRatio(ratio),
    '--banner-collage-basis': `${basis}px`,
  } as CSSProperties;
};
