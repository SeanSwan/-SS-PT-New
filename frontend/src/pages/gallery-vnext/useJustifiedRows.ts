/**
 * Gallery vNext — justified-row math. PURE + unit-testable (no DOM, no React state inside the algorithm).
 * Implements Kimi Q6 as binding numbers, not vibes:
 *
 *   vw     rowH  gap  pad   container cap
 *   320    150   8    12    (min tile 140px, else force 2-up — no sliver tiles)
 *   375    160   8    12
 *   414    170   8    16
 *   768    200   12   16
 *   1024   220   12   24
 *   1440   240   16   32    1200px
 *   2560+  260   16   32    1600px, centered (negative space IS the luxury — never full-bleed at 4K)
 *
 * Last row renders at target height, ragged-LEFT, never stretched (the classic justified-grid failure).
 * Intrinsic width/height come from the real photo record, so `aspect-ratio` is reserved before load → CLS 0.
 */
import { useMemo } from 'react';
import type { GalleryPhoto } from './gallery.types';

/** Legacy rows may predate the dimension columns (both nullable) — fall back to 3:2 rather than crash. */
const FALLBACK_RATIO = 1.5;

/**
 * Kimi's no-sliver law, enforced on WIDTH, not just count: `maxPerRow` alone still let a 2:3 portrait
 * beside a 16:9 wide justify down to ~85px at 375vw (measured by probe P1). Any justified row whose
 * narrowest box would render under this floor is split instead.
 */
const MIN_RENDER_WIDTH = 104;

export interface GridConfig {
  rowHeight: number;
  gap: number;
  pad: number;
  containerMax: number | null;
  minTileWidth: number;
}

export interface JustifiedBox {
  photo: GalleryPhoto;
  width: number;
  height: number;
}

export interface JustifiedRow {
  boxes: JustifiedBox[];
  height: number;
  /** true for a final leftover row rendered at target height (left-aligned, not justified) */
  ragged: boolean;
}

const BREAKPOINTS: Array<{ min: number; config: GridConfig }> = [
  { min: 2560, config: { rowHeight: 260, gap: 16, pad: 32, containerMax: 1600, minTileWidth: 140 } },
  { min: 1440, config: { rowHeight: 240, gap: 16, pad: 32, containerMax: 1200, minTileWidth: 140 } },
  { min: 1024, config: { rowHeight: 220, gap: 12, pad: 24, containerMax: null, minTileWidth: 140 } },
  { min: 768, config: { rowHeight: 200, gap: 12, pad: 16, containerMax: null, minTileWidth: 140 } },
  { min: 414, config: { rowHeight: 170, gap: 8, pad: 16, containerMax: null, minTileWidth: 140 } },
  { min: 375, config: { rowHeight: 160, gap: 8, pad: 12, containerMax: null, minTileWidth: 140 } },
  { min: 0, config: { rowHeight: 150, gap: 8, pad: 12, containerMax: null, minTileWidth: 140 } },
];

export function resolveGridConfig(viewportWidth: number): GridConfig {
  const hit = BREAKPOINTS.find((b) => viewportWidth >= b.min);
  return hit ? hit.config : BREAKPOINTS[BREAKPOINTS.length - 1].config;
}

export const photoRatio = (p: Pick<GalleryPhoto, 'width' | 'height'>): number => {
  if (!p.width || !p.height || p.height <= 0) return FALLBACK_RATIO;
  return p.width / p.height;
};

/**
 * Greedy justified packing: accumulate until justifying the row would drop it to/below the target height,
 * then lock the row to exactly fill the content width. A row is also closed at `maxPerRow` so a narrow
 * viewport can never produce sliver tiles (the 320px rule).
 */
export function computeJustifiedRows(
  photos: GalleryPhoto[],
  contentWidth: number,
  config: GridConfig,
): JustifiedRow[] {
  const { rowHeight, gap, minTileWidth } = config;
  if (contentWidth <= 0 || photos.length === 0) return [];

  // Sliver guard: how many tiles of at least minTileWidth fit across the content width.
  const maxPerRow = Math.max(1, Math.floor((contentWidth + gap) / (minTileWidth + gap)));

  const rows: JustifiedRow[] = [];
  let current: GalleryPhoto[] = [];
  let sumRatios = 0;

  const closeRow = (items: GalleryPhoto[], ratios: number, ragged: boolean): JustifiedRow => {
    const gaps = gap * Math.max(0, items.length - 1);
    const available = contentWidth - gaps;
    const height = ragged ? rowHeight : available / ratios;
    let used = 0;
    const boxes = items.map((photo, i) => {
      // Round to whole pixels and give the final box the remainder so the row fills exactly (no 1px seam).
      const raw = photoRatio(photo) * height;
      const width = i === items.length - 1 && !ragged ? available - used : Math.round(raw);
      used += width;
      return { photo, width, height: Math.round(height) };
    });
    return { boxes, height: Math.round(height), ragged };
  };

  const queue = [...photos];
  while (queue.length > 0) {
    const photo = queue.shift()!;
    current.push(photo);
    sumRatios += photoRatio(photo);
    const gaps = gap * (current.length - 1);
    const justifiedHeight = (contentWidth - gaps) / sumRatios;

    if (justifiedHeight <= rowHeight || current.length >= maxPerRow) {
      // No-sliver floor: if justifying THIS row would render its narrowest frame under the floor,
      // return the last frame to the stream and close the row without it (count 1 always closes).
      const minBox = Math.min(...current.map((p) => photoRatio(p) * justifiedHeight));
      if (minBox < MIN_RENDER_WIDTH && current.length > 1) {
        const popped = current.pop()!;
        sumRatios -= photoRatio(popped);
        queue.unshift(popped);
      }
      rows.push(closeRow(current, sumRatios, false));
      current = [];
      sumRatios = 0;
    }
  }

  // Leftover → target height, left-aligned, NOT stretched.
  if (current.length > 0) rows.push(closeRow(current, sumRatios, true));

  return rows;
}

/** React wrapper — memoized so row math only recomputes when photos or measurements actually change. */
export function useJustifiedRows(
  photos: GalleryPhoto[],
  containerWidth: number,
  viewportWidth: number,
): { rows: JustifiedRow[]; config: GridConfig; contentWidth: number } {
  return useMemo(() => {
    const config = resolveGridConfig(viewportWidth);
    const capped = config.containerMax
      ? Math.min(containerWidth, config.containerMax)
      : containerWidth;
    const contentWidth = Math.max(0, capped - config.pad * 2);
    return { rows: computeJustifiedRows(photos, contentWidth, config), config, contentWidth };
  }, [photos, containerWidth, viewportWidth]);
}
