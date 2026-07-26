import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildVideoListPath,
  formatDuration,
  getCollectionPath,
  getVisiblePaginationPages,
  getVideoWatchPath,
  hasActiveVideoFilters,
  normalizeContentTypeLabel,
  normalizeCollectionCatalogResponse,
  normalizeVideoCatalogResponse,
  videoLibraryErrorMeta,
} from './VideoLibraryV3.logic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

const sourceFiles = {
  page: 'VideoLibraryV3.tsx',
  videoCardItem: 'VideoLibraryV3.VideoCardItem.tsx',
  logic: 'VideoLibraryV3.logic.ts',
  types: 'VideoLibraryV3.types.ts',
  layoutStyles: 'VideoLibraryV3.layoutStyles.ts',
  controlStyles: 'VideoLibraryV3.controlStyles.ts',
  heroStyles: 'VideoLibraryV3.heroStyles.ts',
  cardStyles: 'VideoLibraryV3.cardStyles.ts',
};

describe('VideoLibraryV3 hardening contracts', () => {
  it('keeps the mounted video library slice split under the source line cap', () => {
    Object.entries(sourceFiles).forEach(([label, path]) => {
      const lineCount = read(path).split(/\r?\n/).length;
      expect(lineCount, label).toBeLessThanOrEqual(300);
    });
  });

  it('does not reintroduce raw style, console, or unencoded navigation hazards', () => {
    const page = read(sourceFiles.page);
    const cardItem = read(sourceFiles.videoCardItem);
    const styleSource = `${read(sourceFiles.layoutStyles)}\n${read(sourceFiles.cardStyles)}`;

    expect(page).not.toMatch(/style=\{\{/);
    expect(page).not.toMatch(/console\.(error|warn)/);
    expect(page).not.toContain('navigate(`/watch/${video.slug}`)');
    expect(page).not.toContain('navigate(`/collections/${collection.slug}`)');
    expect(page).toContain('sanitizeImageUrl(collection.thumbnail)');
    expect(cardItem).toContain('sanitizeImageUrl(video.thumbnail)');
    expect(page).toContain('type="button"');
    expect(page).toContain('SearchButton');
    expect(page).toContain('ClearFiltersButton');
    expect(page).toContain('Training Video Vault');
    expect(page).toContain('The SwanStudios Video Vault Opens Soon');
    expect(page).toContain('https://www.youtube.com/@swanstudios2018');
    expect(page).toContain('rel="noreferrer"');
    expect(page).toContain('pagination.total > 0 || collections.length > 0');
    expect(styleSource).toContain('min-height: 44px');
    expect(page).toContain('HeroStats');
    expect(page).toContain('Previous page');
    expect(page).toContain('Next page');
    expect(page).toContain('aria-live="polite"');
    expect(styleSource).not.toMatch(/rgba\(/);
    expect(styleSource).not.toMatch(/transition:\s*all/);
    expect(styleSource).toContain('prefers-reduced-motion');
  });

  it('normalizes malformed catalog payloads before rendering cards', () => {
    const catalog = normalizeVideoCatalogResponse({
      success: true,
      data: {
        videos: [
          {
            id: 'v1',
            title: 'Bench Press',
            slug: 'bench press',
            source: 'youtube',
            durationSeconds: '95',
            viewCount: 'not-a-number',
            locked: true,
          },
          { id: '', title: 'Bad', slug: 'bad' },
        ],
        pagination: { page: '2', totalPages: '3', total: '21' },
      },
    });

    expect(catalog?.videos).toHaveLength(1);
    expect(catalog?.videos[0]).toMatchObject({
      slug: 'bench press',
      source: 'youtube',
      durationSeconds: 95,
      viewCount: 0,
      locked: true,
    });
    expect(catalog?.pagination).toEqual({ page: 2, totalPages: 3, total: 21 });
    expect(normalizeVideoCatalogResponse({ success: false })).toBeNull();
  });

  it('normalizes collections and encodes route path segments', () => {
    const collections = normalizeCollectionCatalogResponse({
      success: true,
      data: {
        collections: [
          { id: 'c1', title: 'Mobility', slug: 'mobility/core', videoCount: '4' },
          { id: 'missing-slug', title: 'Bad' },
        ],
      },
    });

    expect(collections).toHaveLength(1);
    expect(collections?.[0].videoCount).toBe(4);
    expect(getCollectionPath('mobility/core')).toBe('/collections/mobility%2Fcore');
    expect(getVideoWatchPath('bench press')).toBe('/watch/bench%20press');
    expect(getVideoWatchPath('   ')).toBeNull();
    expect(buildVideoListPath(2, 'course_lesson', 'push pull')).toBe(
      '/api/v2/videos?page=2&limit=20&contentType=course_lesson&search=push+pull'
    );
  });

  it('formats invalid duration values safely', () => {
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(-10)).toBe('0:00');
    expect(getVisiblePaginationPages({ page: 500, totalPages: 1000, total: 1000 })).toHaveLength(7);
    expect(videoLibraryErrorMeta({ response: { status: 500 }, code: 'ERR_NETWORK' })).toEqual({
      status: 500,
      code: 'ERR_NETWORK',
    });
  });

  it('exposes filter state helpers for clearable search controls', () => {
    expect(hasActiveVideoFilters('', '')).toBe(false);
    expect(hasActiveVideoFilters('tutorial', '')).toBe(true);
    expect(hasActiveVideoFilters('', 'bench')).toBe(true);
    expect(normalizeContentTypeLabel('course_lesson')).toBe('Course Lesson');
    expect(normalizeContentTypeLabel('')).toBe('All Content');
    expect(normalizeContentTypeLabel('made_up_type')).toBe('Made Up Type');
  });
});
