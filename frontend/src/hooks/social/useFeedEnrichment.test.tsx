import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeedEnrichment } from './useFeedEnrichment';

const mocks = vi.hoisted(() => ({
  authAxios: {
    get: vi.fn(),
  },
  user: { id: 'user-1' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mocks.authAxios,
    user: mocks.user,
  }),
}));

const apiItem = {
  id: 'nasa-images-GSFC_20260628',
  kind: 'enrichment',
  source: 'nasa-images',
  category: 'space',
  title: 'Earth glows beyond the blue horizon',
  summary: 'A short, neutral NASA Image Library spark for the community feed.',
  mediaType: 'image',
  mediaUrl: 'https://images.example.com/earth.jpg',
  url: 'https://images.nasa.gov/details/GSFC_20260628',
  publishedAt: '2026-06-28T00:00:00.000Z',
};

describe('useFeedEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads safe feed enrichment through the authenticated backend route', async () => {
    mocks.authAxios.get.mockResolvedValue({ data: { items: [
      apiItem,
      {
        ...apiItem,
        id: 'wikimedia-commons-blue-bird',
        source: 'wikimedia-commons',
        category: 'nature',
        title: 'Blue bird on branch',
        mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bird/blue-bird.jpg/1200px-blue-bird.jpg',
        url: 'https://commons.wikimedia.org/wiki/File:Blue_bird_on_branch.jpg',
      },
    ] } });

    const { result } = renderHook(() => useFeedEnrichment({ limit: 3 }));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(mocks.authAxios.get).toHaveBeenCalledWith('/api/social/feed-enrichment?limit=3');
    expect(result.current.items[0]).toMatchObject({
      id: apiItem.id,
      kind: 'enrichment',
      source: 'nasa-images',
      title: apiItem.title,
    });
    expect(result.current.items[1]).toMatchObject({
      id: 'wikimedia-commons-blue-bird',
      source: 'wikimedia-commons',
      category: 'nature',
    });
    expect(result.current.error).toBeNull();
  });

  it('drops unsafe or unknown enrichment metadata at the frontend boundary', async () => {
    mocks.authAxios.get.mockResolvedValue({
      data: {
        items: [
          {
            ...apiItem,
            id: 'unsafe-item',
            source: 'unknown-provider',
            category: 'unknown-category',
            url: 'javascript:alert(1)',
            mediaUrl: 'data:text/html,<script>alert(1)</script>',
          },
          {
            ...apiItem,
            id: 'safe-item',
            url: 'https://images.nasa.gov/details/GSFC_20260628',
            mediaUrl: 'https://images.example.com/earth.jpg',
          },
          {
            ...apiItem,
            id: 'known-source-unsafe-url',
            url: 'javascript:alert(1)',
            mediaType: 'video',
            mediaUrl: 'https://www.youtube.com/watch?v=abc123',
          },
          {
            ...apiItem,
            id: 123,
          },
        ],
      },
    });

    const { result } = renderHook(() => useFeedEnrichment({ limit: 3 }));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.items[0]).toMatchObject({ id: 'safe-item', url: 'https://images.nasa.gov/details/GSFC_20260628' });
    const sanitizedItem = result.current.items.find((item) => item.id === 'known-source-unsafe-url');
    expect(sanitizedItem).toMatchObject({ id: 'known-source-unsafe-url', source: 'nasa-images' });
    expect(sanitizedItem?.url).toBeUndefined();
    expect(sanitizedItem?.mediaUrl).toBeUndefined();
    expect(sanitizedItem?.mediaType).toBeUndefined();
  });

  it('fails quietly so the real social feed remains usable', async () => {
    mocks.authAxios.get.mockRejectedValue(new Error('provider offline'));

    const { result } = renderHook(() => useFeedEnrichment({ limit: 3 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe('Feed enrichment unavailable');
  });
});
