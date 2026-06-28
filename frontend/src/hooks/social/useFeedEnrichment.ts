import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export type FeedEnrichmentSource = 'nasa-apod' | 'inaturalist' | 'quotable' | 'swan-curated';
export type FeedEnrichmentCategory = 'space' | 'nature' | 'motivation' | 'movement' | 'growth';

export interface FeedEnrichmentItem {
  id: string;
  kind: 'enrichment';
  source: FeedEnrichmentSource;
  category: FeedEnrichmentCategory;
  title: string;
  summary: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  url?: string;
  publishedAt?: string;
}

interface UseFeedEnrichmentOptions {
  enabled?: boolean;
  limit?: number;
}

const clampLimit = (limit: number | undefined): number => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, Math.round(parsed)));
};

const normalizeItems = (items: unknown): FeedEnrichmentItem[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is FeedEnrichmentItem => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<FeedEnrichmentItem>;
    return candidate.kind === 'enrichment'
      && typeof candidate.id === 'string'
      && typeof candidate.title === 'string'
      && typeof candidate.summary === 'string';
  });
};

export const useFeedEnrichment = ({ enabled = true, limit = 5 }: UseFeedEnrichmentOptions = {}) => {
  const { authAxios, user } = useAuth();
  const [items, setItems] = useState<FeedEnrichmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnrichment = useCallback(async () => {
    if (!enabled || !user || !authAxios) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const safeLimit = clampLimit(limit);
      const response = await authAxios.get(`/api/social/feed-enrichment?limit=${safeLimit}`);
      setItems(normalizeItems(response.data?.items));
      setError(null);
    } catch {
      setItems([]);
      setError('Feed enrichment unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, enabled, limit, user]);

  useEffect(() => {
    void loadEnrichment();
  }, [loadEnrichment]);

  return {
    items,
    isLoading,
    error,
    refresh: loadEnrichment,
  };
};

export default useFeedEnrichment;