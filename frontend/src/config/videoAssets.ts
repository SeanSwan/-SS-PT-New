// frontend/src/config/videoAssets.ts
// Centralized video asset URLs — served from Cloudflare R2 in production,
// falls back to /public locally when VITE_R2_VIDEO_URL is not set.

const R2_BASE = import.meta.env.VITE_R2_VIDEO_URL?.replace(/\/+$/, '') || '';

const video = (filename: string): string =>
  R2_BASE ? `${R2_BASE}/${filename}` : `/${filename}`;

export const VIDEO = {
  swan:       video('swan.mp4'),
  swans:      video('Swans.mp4'),
  run:        video('Run.mp4'),
  smoke:      video('smoke.mp4'),
  forest:     video('forest.mp4'),
  waves:      video('Waves.mp4'),
  fish:       video('fish.mp4'),
  galaxy1:    video('galaxy1.mp4'),
  swanGolden: video('swan-golden.mp4'),
  swanSilver: video('swan-silver.mp4'),
  swanMov2:   video('Swan-mov-2.mp4'),
} as const;

/** All video filenames — used by the R2 upload script */
export const ALL_VIDEO_FILES = [
  'swan.mp4', 'Swans.mp4', 'Run.mp4', 'smoke.mp4', 'forest.mp4',
  'Waves.mp4', 'fish.mp4', 'galaxy1.mp4', 'swan-golden.mp4',
  'swan-silver.mp4', 'Swan-mov-2.mp4',
] as const;
