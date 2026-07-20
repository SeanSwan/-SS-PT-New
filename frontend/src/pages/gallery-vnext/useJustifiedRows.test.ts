/**
 * Gallery vNext — justified-row math contract. Locks Kimi Q6's BINDING numbers and the three failure modes
 * she named: sliver tiles at 320, billboard rows at 2560/3840, and a stretched last row.
 */
import { describe, expect, it } from 'vitest';
import { computeJustifiedRows, photoRatio, resolveGridConfig } from './useJustifiedRows';
import type { GalleryPhoto } from './gallery.types';

const photo = (id: number, width: number | null, height: number | null): GalleryPhoto => ({
  id,
  photoNumber: id,
  displayName: `photo-${id}`,
  url: `https://example.test/${id}.jpg`,
  thumbnailUrl: null,
  mediumUrl: null,
  width,
  height,
  enhancedUrl: null,
  enhancementRequestCount: 0,
});

/** 12 landscape 3:2 frames — the common case. */
const landscapes = Array.from({ length: 12 }, (_, i) => photo(i + 1, 3000, 2000));

describe('resolveGridConfig — Kimi Q6 binding matrix', () => {
  it('returns the specified rowHeight/gap/pad per breakpoint', () => {
    expect(resolveGridConfig(320)).toMatchObject({ rowHeight: 150, gap: 8, pad: 12 });
    expect(resolveGridConfig(375)).toMatchObject({ rowHeight: 160, gap: 8, pad: 12 });
    expect(resolveGridConfig(414)).toMatchObject({ rowHeight: 170, gap: 8, pad: 16 });
    expect(resolveGridConfig(768)).toMatchObject({ rowHeight: 200, gap: 12, pad: 16 });
    expect(resolveGridConfig(1024)).toMatchObject({ rowHeight: 220, gap: 12, pad: 24 });
    expect(resolveGridConfig(1440)).toMatchObject({ rowHeight: 240, gap: 16, containerMax: 1200 });
  });

  it('caps the container at 1600 on wide + 4K so the grid never goes full-bleed', () => {
    expect(resolveGridConfig(2560)).toMatchObject({ rowHeight: 260, containerMax: 1600 });
    expect(resolveGridConfig(3840)).toMatchObject({ rowHeight: 260, containerMax: 1600 });
  });
});

describe('computeJustifiedRows', () => {
  it('returns nothing for an empty set or a zero-width container', () => {
    expect(computeJustifiedRows([], 1200, resolveGridConfig(1440))).toEqual([]);
    expect(computeJustifiedRows(landscapes, 0, resolveGridConfig(1440))).toEqual([]);
  });

  it('justified rows fill the content width EXACTLY (no 1px seam)', () => {
    const config = resolveGridConfig(1440);
    const contentWidth = 1200 - config.pad * 2;
    const rows = computeJustifiedRows(landscapes, contentWidth, config);
    const justified = rows.filter((r) => !r.ragged);
    expect(justified.length).toBeGreaterThan(0);
    for (const row of justified) {
      const total =
        row.boxes.reduce((sum, b) => sum + b.width, 0) + config.gap * (row.boxes.length - 1);
      expect(total).toBe(contentWidth);
    }
  });

  it('renders a leftover last row at target height, ragged-left — never stretched', () => {
    const config = resolveGridConfig(1440);
    const contentWidth = 1200 - config.pad * 2;
    // 7 frames guarantees a leftover row at this width.
    const rows = computeJustifiedRows(landscapes.slice(0, 7), contentWidth, config);
    const last = rows[rows.length - 1];
    if (last.ragged) {
      expect(last.height).toBe(config.rowHeight);
      const total =
        last.boxes.reduce((sum, b) => sum + b.width, 0) + config.gap * (last.boxes.length - 1);
      expect(total).toBeLessThan(contentWidth); // left-aligned, not stretched to fill
    }
  });

  it('never renders a sub-floor sliver when a tall portrait shares a row with a wide frame (probe P1 regression)', () => {
    // 2:3 portrait + 16:9 wide at 375-class width justified to ~85px portrait before the width floor.
    const mixed = [
      photo(1, 2000, 3000), // 0.667
      photo(2, 3200, 1800), // 1.78
      photo(3, 2000, 3000),
      photo(4, 3200, 1800),
      photo(5, 3000, 2000),
    ];
    const config = resolveGridConfig(375);
    const contentWidth = 375 - 32 - config.pad * 2; // shell pad + grid pad, as rendered
    const rows = computeJustifiedRows(mixed, contentWidth, config);
    for (const row of rows) {
      for (const box of row.boxes) {
        expect(box.width, `no sub-floor tile (row of ${row.boxes.length})`).toBeGreaterThan(100);
      }
    }
  });

  it('never produces sliver tiles at 320px (falls back to 2-up)', () => {
    const config = resolveGridConfig(320);
    const contentWidth = 320 - config.pad * 2;
    const rows = computeJustifiedRows(landscapes, contentWidth, config);
    for (const row of rows) {
      expect(row.boxes.length).toBeLessThanOrEqual(2);
      for (const box of row.boxes) expect(box.width).toBeGreaterThan(100);
    }
  });

  it('never produces a billboard row at 4K (content is capped, rows stay bounded)', () => {
    const config = resolveGridConfig(3840);
    const contentWidth = (config.containerMax ?? 3840) - config.pad * 2;
    const rows = computeJustifiedRows(landscapes, contentWidth, config);
    for (const row of rows) {
      expect(row.height).toBeLessThanOrEqual(config.rowHeight * 1.3);
      for (const box of row.boxes) expect(box.width).toBeLessThanOrEqual(contentWidth);
    }
  });

  it('survives legacy rows with NULL dimensions (no NaN, uses the 3:2 fallback)', () => {
    expect(photoRatio(photo(1, null, null))).toBe(1.5);
    expect(photoRatio(photo(2, 3000, 0))).toBe(1.5);
    const mixed = [photo(1, null, null), photo(2, 4000, 3000), photo(3, null, 2000)];
    const config = resolveGridConfig(1024);
    const rows = computeJustifiedRows(mixed, 900, config);
    for (const row of rows) {
      for (const box of row.boxes) {
        expect(Number.isFinite(box.width)).toBe(true);
        expect(Number.isFinite(box.height)).toBe(true);
        expect(box.width).toBeGreaterThan(0);
      }
    }
  });
});
