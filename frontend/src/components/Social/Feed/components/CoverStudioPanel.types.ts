/**
 * COMPONENT: CoverStudioPanel.types
 * PURPOSE: Types, constants, and branch-light helpers for the feed cover studio panel.
 * FLOW: CoverStudioPanel controls state; section components consume these values.
 */
import type {
  BannerCollageLayout,
  BannerCropState,
  BannerObjectFit,
  BannerObjectPosition,
  BannerPreset,
} from '../../../../services/profileService';

export type CoverType = 'single' | 'stage' | 'collage';

export interface CoverStudioPanelProps {
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerFrameHeight: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
  bannerPresets: BannerPreset[];
  onBannerCropPreview: (next: BannerCropState) => void;
  onBannerCropCommit: (next: BannerCropState) => void;
  onBannerCollageFiles: (files: FileList | File[]) => void;
  onBannerCollageRemove: (index: number) => void;
  onBannerCollageLayoutCommit: (layout: BannerCollageLayout) => void;
  onBannerPresetSave: () => void;
  onBannerPresetApply: (presetId: string) => void;
  onBannerPresetRemove: (presetId: string) => void;
}

export type CoverCropValues = {
  position: BannerObjectPosition;
  fit: BannerObjectFit;
  scale: number;
  height: number;
};

const STAGE_LAYOUTS: BannerCollageLayout[] = ['atrium', 'vitrine', 'mosaic'];
const COLLAGE_LAYOUTS: BannerCollageLayout[] = ['stream', 'spotlight', 'crossfade'];

export const COVER_TYPES: Array<{ id: CoverType; name: string; desc: string; rec?: boolean }> = [
  { id: 'single', name: 'Single', desc: 'One photo or video, full-bleed.' },
  { id: 'stage', name: 'Stage', desc: 'A cinematic gallery of your media.', rec: true },
  { id: 'collage', name: 'Collage', desc: 'A composed crystalline mosaic.' },
];

export const LAYOUT_LABELS: Record<string, string> = {
  atrium: 'Atrium',
  vitrine: 'Vitrine',
  mosaic: 'Mosaic',
  stream: 'Stream',
  spotlight: 'Spotlight',
  crossfade: 'Crossfade',
};

export const SCHEMATIC: Record<string, Array<{ w: string; h: string }>> = {
  single: [{ w: '72%', h: '82%' }],
  atrium: [{ w: '18%', h: '52%' }, { w: '34%', h: '82%' }, { w: '18%', h: '52%' }],
  vitrine: [{ w: '52%', h: '82%' }, { w: '20%', h: '82%' }],
  mosaic: [{ w: '40%', h: '82%' }, { w: '24%', h: '82%' }, { w: '24%', h: '82%' }],
  stream: [{ w: '24%', h: '72%' }, { w: '24%', h: '72%' }, { w: '24%', h: '72%' }],
  spotlight: [{ w: '48%', h: '82%' }, { w: '22%', h: '82%' }, { w: '14%', h: '82%' }],
  crossfade: [{ w: '82%', h: '82%' }],
};

export const FOCAL_PRESETS = [
  { x: 20, y: 18, label: 'NW' },
  { x: 50, y: 18, label: 'Top' },
  { x: 80, y: 18, label: 'NE' },
  { x: 20, y: 50, label: 'Left' },
  { x: 50, y: 50, label: 'Center' },
  { x: 80, y: 50, label: 'Right' },
  { x: 20, y: 82, label: 'SW' },
  { x: 50, y: 82, label: 'Bottom' },
  { x: 80, y: 82, label: 'SE' },
];

export const HEIGHT_PRESETS: Array<{ value: number; label: string }> = [
  { value: 320, label: 'Standard' },
  { value: 460, label: 'Tall' },
  { value: 600, label: 'Cinema' },
];

const DEFAULT_LAYOUT_BY_TYPE: Partial<Record<CoverType, BannerCollageLayout>> = {
  stage: 'atrium',
  collage: 'stream',
};

const LAYOUTS_BY_TYPE: Partial<Record<CoverType, BannerCollageLayout[]>> = {
  stage: STAGE_LAYOUTS,
  collage: COLLAGE_LAYOUTS,
};

export function getCoverType(fit: BannerObjectFit, layout: BannerCollageLayout): CoverType {
  if (fit !== 'collage') return 'single';
  if (STAGE_LAYOUTS.includes(layout)) return 'stage';
  return 'collage';
}

export function getLayoutOptions(coverType: CoverType): BannerCollageLayout[] {
  if (coverType === 'stage') return STAGE_LAYOUTS;
  return COLLAGE_LAYOUTS;
}

export function getTypeSchematicKind(coverType: CoverType) {
  if (coverType === 'stage') return 'atrium';
  if (coverType === 'collage') return 'stream';
  return 'single';
}

export function getFallbackLayout(next: CoverType, current: BannerCollageLayout) {
  const options = LAYOUTS_BY_TYPE[next];
  if (!options) return null;
  if (options.includes(current)) return current;
  return DEFAULT_LAYOUT_BY_TYPE[next] || null;
}

export function getSingleFit(fit: BannerObjectFit): BannerObjectFit {
  if (fit === 'collage') return 'cover';
  return fit;
}

export function baseCropFromValues(values: CoverCropValues): BannerCropState {
  return { ...values };
}

export function isFocalPoint(focal: { x: number; y: number }, x: number, y: number) {
  return Math.abs(focal.x - x) < 6 && Math.abs(focal.y - y) < 6;
}
