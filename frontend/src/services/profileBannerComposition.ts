/**
 * profileBannerComposition
 * ========================
 * CSS-safe banner crop, collage, carousel, and preset contract for the
 * user dashboard profile header. This module is intentionally separate from
 * profileService so the API client stays small while existing imports can
 * keep consuming the same exported banner types through profileService.
 */

import { sanitizeImageUrl } from '../utils/imageUrl';

/**
 * 9-preset 3x3 grid for legacy banner photo crop alignment.
 * New UI writes percentage coordinates, but old rows still hydrate cleanly.
 */
export const BANNER_OBJECT_POSITION_PRESETS = [
  'left top', 'center top', 'right top',
  'left center', 'center center', 'right center',
  'left bottom', 'center bottom', 'right bottom',
] as const;

type LegacyBannerObjectPosition = (typeof BANNER_OBJECT_POSITION_PRESETS)[number];

export const BANNER_OBJECT_FIT_OPTIONS = ['cover', 'contain', 'fill', 'tile', 'collage'] as const;
export type BannerObjectFit = (typeof BANNER_OBJECT_FIT_OPTIONS)[number];
export type BannerObjectPosition = string;
export const BANNER_CAROUSEL_LAYOUT_OPTIONS = [
  'carousel-reel',
  'carousel-cinema',
  'carousel-coverflow',
  'carousel-stack',
  'carousel-ticker',
] as const;
export const BANNER_COLLAGE_LAYOUT_OPTIONS = [
  // Smart Carousel fills portrait/partial media with a hero frame, side rail,
  // and built-in crystalline theme tiles instead of leaving dead space.
  'smart-carousel',
  'stream',
  'mosaic',
  'spotlight',
  // 2026-06-11 (M5b): cinematic crossfade hero — stacked photos fading
  // through with a slow Ken-Burns drift. Standalone (NOT a marquee carousel).
  'crossfade',
  // 2026-06-13 (Slice 2 — Feed Banner Studio): premium "Stage" layouts.
  // Atrium = 3D coverflow gallery; Vitrine = hero + thumbnail rail. Both are
  // auto-advancing, full-bleed standalone stages (NOT marquee carousels).
  // MUST stay in sync with backend BANNER_COLLAGE_LAYOUTS (profileController.mjs).
  'atrium',
  'vitrine',
  ...BANNER_CAROUSEL_LAYOUT_OPTIONS,
] as const;
export type BannerCollageLayout = (typeof BANNER_COLLAGE_LAYOUT_OPTIONS)[number];

export const DEFAULT_BANNER_OBJECT_POSITION: BannerObjectPosition = '50% 50%';
export const DEFAULT_BANNER_OBJECT_FIT: BannerObjectFit = 'cover';
export const DEFAULT_BANNER_COLLAGE_LAYOUT: BannerCollageLayout = 'smart-carousel';
export const DEFAULT_BANNER_STICKY_CAROUSEL = false;
export const DEFAULT_BANNER_IMAGE_SCALE = 1;
export const DEFAULT_BANNER_FRAME_HEIGHT = 320;
export const MIN_BANNER_FRAME_HEIGHT = 180;
export const MAX_BANNER_FRAME_HEIGHT = 1000;
export const MAX_BANNER_COLLAGE_PHOTOS = 12;
export const MAX_BANNER_COLLAGE_VIDEOS = 3;
export const MAX_BANNER_PRESETS = 12;
export const BANNER_MEDIA_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BANNER_MEDIA_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const BANNER_COLLAGE_MEDIA_TYPES = [...BANNER_MEDIA_IMAGE_TYPES, ...BANNER_MEDIA_VIDEO_TYPES] as const;
export const MAX_BANNER_COLLAGE_MEDIA_UPLOAD_SIZE = 15 * 1024 * 1024;

const BANNER_VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov)(?:[?#].*)?$/i;
const PERCENT_POSITION_PATTERN = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;

const LEGACY_BANNER_OBJECT_POSITIONS: Record<LegacyBannerObjectPosition, BannerObjectPosition> = {
  'left top': '0% 0%',
  'center top': '50% 0%',
  'right top': '100% 0%',
  'left center': '0% 50%',
  'center center': DEFAULT_BANNER_OBJECT_POSITION,
  'right center': '100% 50%',
  'left bottom': '0% 100%',
  'center bottom': '50% 100%',
  'right bottom': '100% 100%',
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const formatPercent = (value: number) => `${Number(value.toFixed(2))}%`;

const isLegacyBannerObjectPosition = (value: string): value is LegacyBannerObjectPosition =>
  (BANNER_OBJECT_POSITION_PRESETS as readonly string[]).includes(value);

export function isBannerObjectPosition(value: unknown): value is BannerObjectPosition {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (isLegacyBannerObjectPosition(trimmed)) return true;
  const match = trimmed.match(PERCENT_POSITION_PATTERN);
  if (!match) return false;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

export function normalizeBannerObjectPosition(value: unknown): BannerObjectPosition {
  if (typeof value !== 'string') return DEFAULT_BANNER_OBJECT_POSITION;
  const trimmed = value.trim();
  if (isLegacyBannerObjectPosition(trimmed)) {
    return LEGACY_BANNER_OBJECT_POSITIONS[trimmed];
  }
  const match = trimmed.match(PERCENT_POSITION_PATTERN);
  if (!match) return DEFAULT_BANNER_OBJECT_POSITION;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return DEFAULT_BANNER_OBJECT_POSITION;
  return `${formatPercent(clampPercent(x))} ${formatPercent(clampPercent(y))}`;
}

export function isBannerObjectFit(value: unknown): value is BannerObjectFit {
  return typeof value === 'string'
    && (BANNER_OBJECT_FIT_OPTIONS as readonly string[]).includes(value);
}

export function isBannerCollageLayout(value: unknown): value is BannerCollageLayout {
  return typeof value === 'string'
    && (BANNER_COLLAGE_LAYOUT_OPTIONS as readonly string[]).includes(value);
}

export function isBannerCarouselLayout(value: unknown): value is (typeof BANNER_CAROUSEL_LAYOUT_OPTIONS)[number] {
  return typeof value === 'string'
    && (BANNER_CAROUSEL_LAYOUT_OPTIONS as readonly string[]).includes(value);
}

export function normalizeBannerCollageLayout(value: unknown): BannerCollageLayout {
  return isBannerCollageLayout(value) ? value : DEFAULT_BANNER_COLLAGE_LAYOUT;
}

export function normalizeBannerStickyCarousel(value: unknown): boolean {
  return value === true;
}

export function normalizeBannerImageScale(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return DEFAULT_BANNER_IMAGE_SCALE;
  return Number(Math.min(3, Math.max(0.5, next)).toFixed(2));
}

export function normalizeBannerFrameHeight(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return DEFAULT_BANNER_FRAME_HEIGHT;
  return Math.round(Math.min(MAX_BANNER_FRAME_HEIGHT, Math.max(MIN_BANNER_FRAME_HEIGHT, next)));
}

export const isBannerCollageVideoUrl = (url: string): boolean =>
  BANNER_VIDEO_EXTENSION_PATTERN.test(url);

export function normalizeBannerCollagePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  let videoCount = 0;

  for (const candidate of value) {
    if (normalized.length >= MAX_BANNER_COLLAGE_PHOTOS) break;
    const url = sanitizeImageUrl(typeof candidate === 'string' ? candidate : null);
    if (!url) continue;
    if (isBannerCollageVideoUrl(url)) {
      if (videoCount >= MAX_BANNER_COLLAGE_VIDEOS) continue;
      videoCount += 1;
    }
    normalized.push(url);
  }

  return normalized;
}

export interface BannerPreset {
  id: string;
  name: string;
  bannerPhoto?: string;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerFrameHeight: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
  bannerStickyCarousel: boolean;
  createdAt: string;
}

export function normalizeBannerPresets(value: unknown): BannerPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((preset, index): BannerPreset | null => {
      if (!preset || typeof preset !== 'object') return null;
      const candidate = preset as Partial<BannerPreset>;
      const bannerPhoto = sanitizeImageUrl(typeof candidate.bannerPhoto === 'string' ? candidate.bannerPhoto : null);
      return {
        id: typeof candidate.id === 'string' && candidate.id.trim()
          ? candidate.id.trim().slice(0, 80)
          : `banner-preset-${index + 1}`,
        name: typeof candidate.name === 'string' && candidate.name.trim()
          ? candidate.name.trim().slice(0, 72)
          : `Saved banner ${index + 1}`,
        ...(bannerPhoto ? { bannerPhoto } : {}),
        bannerObjectPosition: normalizeBannerObjectPosition(candidate.bannerObjectPosition),
        bannerObjectFit: isBannerObjectFit(candidate.bannerObjectFit)
          ? candidate.bannerObjectFit
          : DEFAULT_BANNER_OBJECT_FIT,
        bannerImageScale: normalizeBannerImageScale(candidate.bannerImageScale),
        bannerFrameHeight: normalizeBannerFrameHeight(candidate.bannerFrameHeight),
        bannerCollagePhotos: normalizeBannerCollagePhotos(candidate.bannerCollagePhotos),
        bannerCollageLayout: normalizeBannerCollageLayout(candidate.bannerCollageLayout),
        bannerStickyCarousel: normalizeBannerStickyCarousel(candidate.bannerStickyCarousel),
        createdAt: typeof candidate.createdAt === 'string' && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date(0).toISOString(),
      };
    })
    .filter((preset): preset is BannerPreset => Boolean(preset))
    .slice(0, MAX_BANNER_PRESETS);
}

export interface BannerCropState {
  position: BannerObjectPosition;
  fit: BannerObjectFit;
  scale: number;
  height: number;
}
