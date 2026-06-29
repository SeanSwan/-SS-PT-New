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
  if (url.includes('images-api.nasa.gov/search')) {
    return {
      collection: {
        items: [{
          href: 'https://images-api.nasa.gov/asset/GSFC_20260628',
          data: [{
            nasa_id: 'GSFC_20260628',
            title: 'Earth glows beyond the blue horizon',
            description_508: 'A calm NASA view of Earth, ocean, and clouds from orbit.',
            date_created: '2026-06-28T00:00:00Z',
          }],
          links: [{ href: 'https://images-assets.nasa.gov/image/GSFC_20260628/GSFC_20260628~thumb.jpg', render: 'image' }],
        }, {
          href: 'https://images-api.nasa.gov/asset/GSFC_20260629',
          data: [{
            nasa_id: 'GSFC_20260629',
            title: 'A star field over a quiet nebula',
            description_508: 'A deep space field with blue stars and luminous dust.',
            date_created: '2026-06-29T00:00:00Z',
          }],
          links: [{ href: 'https://images-assets.nasa.gov/image/GSFC_20260629/GSFC_20260629~thumb.jpg', render: 'image' }],
        }],
      },
    };
  }

  if (url.includes('commons.wikimedia.org/w/api.php')) {
    return {
      query: {
        pages: {
          100: {
            pageid: 100,
            title: 'File:Wildlife Conservation Issue 8c 1971 U.S. stamps.jpg',
            imageinfo: [{
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/s/stamp/wildlife-stamp.jpg/1200px-wildlife-stamp.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Wildlife_Conservation_stamp.jpg',
              timestamp: '2026-06-25T00:00:00Z',
              extmetadata: {
                ObjectName: { value: 'Wildlife Conservation Issue 8c 1971 U.S. stamps' },
                ImageDescription: { value: '<p>Wildlife Conservation Issue - set of four 8-cent 1971 U.S. stamps.</p>' },
                Artist: { value: 'Postal archive' },
                LicenseShortName: { value: 'Public domain' },
              },
            }],
          },
          101: {
            pageid: 101,
            title: 'File:Blue bird on branch.jpg',
            imageinfo: [{
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bird/blue-bird.jpg/1200px-blue-bird.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Blue_bird_on_branch.jpg',
              timestamp: '2026-06-26T00:00:00Z',
              extmetadata: {
                ObjectName: { value: 'Blue bird on branch' },
                ImageDescription: { value: '<p>A bright bird resting on a flowering branch.</p>' },
                Artist: { value: 'Open nature photographer' },
                LicenseShortName: { value: 'CC BY-SA 4.0' },
              },
            }],
          },
        },
      },
    };
  }
  if (url.includes('api.si.edu/openaccess')) {
    return {
      response: {
        rows: [{
          id: 'edanmdm-nmnhbotany_123',
          content: {
            descriptiveNonRepeating: {
              title: 'Botanical study of a flowering branch',
              record_link: 'https://www.si.edu/object/botanical-study',
              online_media: {
                media: [{ content: 'https://ids.si.edu/ids/deliveryService/id/flowering-branch' }],
              },
            },
            indexedStructured: {
              topic: ['Botany'],
            },
          },
          lastModified: '2026-06-27T00:00:00Z',
        }],
      },
    };
  }

  if (url.includes('developer.nps.gov/api/v1/parks')) {
    return {
      data: [{
        parkCode: 'yose',
        fullName: 'Yosemite National Park',
        description: 'Waterfalls, granite valleys, and forest paths make this park a strong outdoor movement spark.',
        url: 'https://www.nps.gov/yose/index.htm',
        images: [{ url: 'https://www.nps.gov/common/uploads/structured_data/yose-valley.jpg' }],
      }],
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

  it('normalizes official-first providers and caches the server-side result', async () => {
    const fetchJson = makeFetchJson();

    const first = await buildFeedEnrichmentItems({
      fetchJson,
      nowMs: NOW_MS,
      env: {
        NPS_API_KEY: 'test-nps-key',
        SMITHSONIAN_API_KEY: 'test-smithsonian-key',
      },
      limit: 4,
    });
    const second = await buildFeedEnrichmentItems({
      fetchJson,
      nowMs: NOW_MS + 60_000,
      env: {
        NPS_API_KEY: 'test-nps-key',
        SMITHSONIAN_API_KEY: 'test-smithsonian-key',
      },
      limit: 4,
    });

    expect(first.cacheStatus).toBe('miss');
    expect(second.cacheStatus).toBe('hit');
    expect(fetchJson).toHaveBeenCalledTimes(4);
    expect(first.items.map((item) => item.source)).toEqual(expect.arrayContaining([
      'nasa-images',
      'smithsonian',
      'nps',
      'wikimedia-commons',
    ]));
    expect(first.items.every((item) => item.kind === 'enrichment')).toBe(true);
    expect(first.items[0]).toMatchObject({
      category: 'space',
      mediaType: 'image',
      title: 'Earth glows beyond the blue horizon',
    });
    expect(first.items.map((item) => item.title).join(' ')).toContain('Blue bird on branch');
    expect(first.items.map((item) => item.title).join(' ')).not.toMatch(/stamp/i);
  });

  it('skips keyed providers when keys are absent without calling mixed-license filler APIs', async () => {
    const fetchJson = makeFetchJson();

    const result = await buildFeedEnrichmentItems({
      fetchJson,
      nowMs: NOW_MS,
      env: {},
      limit: 4,
    });

    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson.mock.calls[0][0]).toContain('images-api.nasa.gov/search');
    expect(fetchJson.mock.calls[1][0]).toContain('commons.wikimedia.org/w/api.php');
    expect(result.items.map((item) => item.source)).toEqual(expect.arrayContaining([
      'nasa-images',
      'wikimedia-commons',
    ]));
    expect(result.items.filter((item) => item.mediaType === 'image' && item.mediaUrl).length).toBeGreaterThanOrEqual(2);
    expect(result.items.map((item) => item.source)).not.toContain('quotable');
    expect(result.items.map((item) => item.source)).not.toContain('inaturalist');
  });

  it('filters loud/political/medical provider copy and falls back to curated neutral sparks', async () => {
    expect(moderateEnrichmentItem({
      id: 'bad-1',
      kind: 'enrichment',
      source: 'nasa-images',
      category: 'space',
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

  it('strips unsafe provider URLs and does not treat provider pages as playable video', () => {
    const unsafeItem = moderateEnrichmentItem({
      id: 'bad-url-1',
      kind: 'enrichment',
      source: 'nasa-images',
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
      source: 'nasa-images',
      category: 'space',
      title: 'Valid title',
      summary: 'Valid neutral summary.',
    })).toBeNull();

    const videoPage = moderateEnrichmentItem({
      id: 'video-page',
      kind: 'enrichment',
      source: 'nasa-images',
      category: 'space',
      title: 'Webb video tour',
      summary: 'A calm space video page from a trusted provider.',
      mediaType: 'video',
      mediaUrl: 'https://www.youtube.com/watch?v=abc123',
      url: 'https://www.youtube.com/watch?v=abc123',
    });

    expect(videoPage).toMatchObject({ source: 'nasa-images', url: 'https://www.youtube.com/watch?v=abc123' });
    expect(videoPage.mediaUrl).toBeUndefined();
    expect(videoPage.mediaType).toBeUndefined();
  });
});
