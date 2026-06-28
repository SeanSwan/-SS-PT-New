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
  id: 'nasa-apod-2026-06-28',
  kind: 'enrichment',
  source: 'nasa-apod',
  category: 'space',
  title: 'Webb catches a quiet star nursery',
  summary: 'A short, neutral science spark for the community feed.',
  mediaType: 'image',
  mediaUrl: 'https://images.example.com/webb.jpg',
  url: 'https://apod.nasa.gov/example',
  publishedAt: '2026-06-28T00:00:00.000Z',
};

describe('useFeedEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads safe feed enrichment through the authenticated backend route', async () => {
    mocks.authAxios.get.mockResolvedValue({ data: { items: [apiItem] } });

    const { result } = renderHook(() => useFeedEnrichment({ limit: 3 }));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    expect(mocks.authAxios.get).toHaveBeenCalledWith('/api/social/feed-enrichment?limit=3');
    expect(result.current.items[0]).toMatchObject({
      id: apiItem.id,
      kind: 'enrichment',
      source: 'nasa-apod',
      title: apiItem.title,
    });
    expect(result.current.error).toBeNull();
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
