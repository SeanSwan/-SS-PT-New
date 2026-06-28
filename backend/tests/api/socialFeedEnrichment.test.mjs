import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFeedEnrichmentItems,
  clearFeedEnrichmentCache,
  moderateEnrichmentItem,
} from '../../routes/social/feedEnrichment.mjs';

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const NOW_MS = Date.parse('2026-06-28T16:00:00.000Z');

const makeFetchJson = () => vi.fn(async (url) => {
  if (url.includes('api.nasa.gov/planetary/apod')) {
    return {
      title: 'Webb catches a quiet star nursery',
      explanation: 'A calm look at dust and new stars from deep space.',
      media_type: 'image',
      url: 'https://images.example.com/webb.jpg',
      hdurl: 'https://images.example.com/webb-hd.jpg',
      date: '2026-06-28',
    };
  }

  if (url.includes('api.inaturalist.org')) {
    return {
      results: [{
        id: 42,
        uri: 'https://inaturalist.org/observations/42',
        observed_on: '2026-06-27',
        taxon: {
          preferred_common_name: 'Blue passionflower',
          name: 'Passiflora caerulea',
        },
        photos: [{ url: 'https://static.inaturalist.org/photos/square.jpg' }],
      }],
    };
  }

  if (url.includes('api.quotable.io')) {
    return {
      content: 'Small steady steps make the trail visible.',
      author: 'Swan Signal',
    };
  }

  throw new Error(`unexpected url ${url}`);
});

describe('social feed enrichment API contract', () => {
  beforeEach(() => {
    clearFeedEnrichmentCache();
  });

  it('mounts the authenticated enrichment route before post routes', () => {
    const socialIndex = read('routes/social/index.mjs');
    const enrichmentMount = socialIndex.indexOf("router.use('/feed-enrichment', protect, feedEnrichmentRoutes)");
    const postsMount = socialIndex.indexOf("router.use('/posts', postsRoutes)");

    expect(socialIndex).toContain("import feedEnrichmentRoutes from './feedEnrichment.mjs'");
    expect(enrichmentMount).toBeGreaterThan(-1);
    expect(postsMount).toBeGreaterThan(-1);
    expect(enrichmentMount).toBeLessThan(postsMount);
  });

  it('normalizes safe neutral providers and caches the server-side result', async () => {
    const fetchJson = makeFetchJson();

    const first = await buildFeedEnrichmentItems({
      fetchJson,
      nowMs: NOW_MS,
      env: { NASA_API_KEY: 'test-nasa-key' },
      limit: 4,
    });
    const second = await buildFeedEnrichmentItems({
      fetchJson,
      nowMs: NOW_MS + 60_000,
      env: { NASA_API_KEY: 'test-nasa-key' },
      limit: 4,
    });

    expect(first.cacheStatus).toBe('miss');
    expect(second.cacheStatus).toBe('hit');
    expect(fetchJson).toHaveBeenCalledTimes(3);
    expect(first.items.map((item) => item.source)).toEqual(expect.arrayContaining([
      'nasa-apod',
      'inaturalist',
      'quotable',
    ]));
    expect(first.items.every((item) => item.kind === 'enrichment')).toBe(true);
    expect(first.items[0]).toMatchObject({
      category: 'space',
      mediaType: 'image',
      title: 'Webb catches a quiet star nursery',
    });
  });

  it('filters loud/political/medical provider copy and falls back to curated neutral sparks', async () => {
    expect(moderateEnrichmentItem({
      id: 'bad-1',
      kind: 'enrichment',
      source: 'quotable',
      category: 'motivation',
      title: 'Election war diagnosis update',
      summary: 'Politics and medical claims should never become filler.',
    })).toBeNull();

    const result = await buildFeedEnrichmentItems({
      fetchJson: vi.fn(async () => {
        throw new Error('provider offline');
      }),
      nowMs: NOW_MS,
      env: {},
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.source === 'swan-curated')).toBe(true);
    expect(result.items.every((item) => item.kind === 'enrichment')).toBe(true);
  });

  it('strips unsafe provider URLs and does not render provider pages as playable video', async () => {
    const unsafeItem = moderateEnrichmentItem({
      id: 'bad-url-1',
      kind: 'enrichment',
      source: 'nasa-apod',
      category: 'space',
      title: 'Quiet space image',
      summary: 'A calm provider item with unsafe media fields.',
      mediaType: 'image',
      mediaUrl: 'javascript:alert(1)',
      url: 'data:text/html,<script>alert(1)</script>',
    });

    expect(unsafeItem).toMatchObject({
      title: 'Quiet space image',
      summary: 'A calm provider item with unsafe media fields.',
    });
    expect(unsafeItem.mediaUrl).toBeUndefined();
    expect(unsafeItem.mediaType).toBeUndefined();
    expect(unsafeItem.url).toBeUndefined();
    expect(moderateEnrichmentItem({
      id: 12,
      kind: 'enrichment',
      source: 'nasa-apod',
      category: 'space',
      title: 'Valid title',
      summary: 'Valid neutral summary.',
    })).toBeNull();

    const result = await buildFeedEnrichmentItems({
      fetchJson: vi.fn(async (url) => {
        if (!url.includes('api.nasa.gov/planetary/apod')) throw new Error('provider offline');
        return {
          title: 'Webb video tour',
          explanation: 'A calm space video page from a trusted provider.',
          media_type: 'video',
          url: 'https://www.youtube.com/watch?v=abc123',
          date: '2026-06-28',
        };
      }),
      nowMs: NOW_MS,
      env: {},
      limit: 1,
    });

    expect(result.items[0]).toMatchObject({ source: 'nasa-apod', url: 'https://www.youtube.com/watch?v=abc123' });
    expect(result.items[0].mediaUrl).toBeUndefined();
    expect(result.items[0].mediaType).toBeUndefined();
  });
});
