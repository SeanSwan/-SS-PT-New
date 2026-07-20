/**
 * @file VideoVNext.regression.test.tsx
 * @description Regression coverage for the flag-on video-library binding. The vNext surface must preserve
 * V3's malformed-payload handling, collection normalization, safe route construction, and pagination window.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiService from '../../services/api.service';
import { DEFAULT_VIDEO_PAGINATION, VIDEO_LIBRARY_LOAD_ERROR } from '../VideoLibraryV3.logic';
import type { CollectionItem, VideoItem } from '../VideoLibraryV3.types';
import { CollectionsStrip } from './CollectionsStrip';
import { useVideoLibrary } from './useVideoLibrary';
import { VideoGlassCard } from './VideoGlassCard';
import { VideoPagination } from './VideoPagination';

vi.mock('../../services/api.service', () => ({
  default: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiService.get);

const validCollection: CollectionItem = {
  id: 'collection-1',
  title: 'Strength',
  slug: 'strength',
  description: '',
  type: 'series',
  visibility: 'public',
  accessTier: 'free',
  thumbnail: null,
  videoCount: 2,
  sortOrder: 1,
};

const validVideo: VideoItem = {
  id: 'video-1',
  title: 'Bench press',
  slug: 'bench-press',
  description: '',
  source: 'upload',
  contentType: 'exercise',
  visibility: 'public',
  accessTier: 'free',
  thumbnail: null,
  durationSeconds: 60,
  viewCount: 0,
  likeCount: 0,
  tags: [],
  featured: false,
  publishedAt: '',
  youtubeVideoId: null,
  locked: false,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Video vNext regressions', () => {
  it('fails closed on a malformed video payload instead of dereferencing null', async () => {
    mockedGet.mockImplementation(async (path) => ({
      data: String(path).includes('/collections')
        ? { success: true, data: { collections: [] } }
        : { success: false },
    }));

    const { result } = renderHook(() => useVideoLibrary());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(VIDEO_LIBRARY_LOAD_ERROR);
    expect(result.current.videos).toEqual([]);
    expect(result.current.pagination).toEqual(DEFAULT_VIDEO_PAGINATION);
  });

  it('consumes the collection normalizer array contract', async () => {
    mockedGet.mockImplementation(async (path) => ({
      data: String(path).includes('/collections')
        ? { success: true, data: { collections: [validCollection] } }
        : {
            success: true,
            data: { videos: [], pagination: DEFAULT_VIDEO_PAGINATION },
          },
    }));

    const { result } = renderHook(() => useVideoLibrary());

    await waitFor(() => expect(result.current.collections).toEqual([validCollection]));
  });

  it('passes the complete pagination shape to the shared window helper', () => {
    render(<VideoPagination page={3} totalPages={5} onPage={vi.fn()} />);

    for (const page of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: String(page) })).toBeInTheDocument();
    }
  });

  it('does not create router links from empty slugs', () => {
    render(
      <MemoryRouter>
        <CollectionsStrip collections={[{ ...validCollection, slug: '' }]} />
        <VideoGlassCard video={{ ...validVideo, slug: '' }} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Bench press')).toBeInTheDocument();
  });
});
