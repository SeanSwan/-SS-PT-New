import type { BannerObjectFit, BannerObjectPosition } from '../../../services/profileService';

export const TILE_REPEAT_COUNT = 360;

export const FIT_LABELS: Record<BannerObjectFit, string> = {
  cover: 'Crop',
  contain: 'Fit whole',
  fill: 'Stretch',
  tile: 'Tile',
  collage: 'Collage',
};

const POSITION_PATTERN = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;
const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov)(?:[?#].*)?$/i;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const formatPercent = (value: number) => `${Number(value.toFixed(2))}%`;

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
