import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export type FeedEnrichmentSource = 'nasa-images' | 'smithsonian' | 'nps' | 'wikimedia-commons' | 'swan-curated';
export type FeedEnrichmentCategory = 'space' | 'nature' | 'parks' | 'culture' | 'movement' | 'growth';

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

const allowedSources = new Set<FeedEnrichmentSource>([
  'nasa-images',
  'smithsonian',
  'nps',
  'wikimedia-commons',
  'swan-curated',
]);

const allowedCategories = new Set<FeedEnrichmentCategory>([
  'space',
  'nature',
  'parks',
  'culture',
  'movement',
  'growth',
]);

const toKnownSource = (value: unknown): FeedEnrichmentSource | null => (
  typeof value === 'string' && allowedSources.has(value as FeedEnrichmentSource)
    ? value as FeedEnrichmentSource
    : null
);

const toKnownCategory = (value: unknown): FeedEnrichmentCategory | null => (
  typeof value === 'string' && allowedCategories.has(value as FeedEnrichmentCategory)
    ? value as FeedEnrichmentCategory
    : null
);

const toSafeHttpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const isDirectVideoUrl = (value: string): boolean => /\.(mp4|webm|ogg)$/i.test(new URL(value).pathname);

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const clampLimit = (limit: number | undefined): number => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, Math.round(parsed)));
};

const normalizeItems = (items: unknown): FeedEnrichmentItem[] => {
  if (!Array.isArray(items)) return [];
  const normalizedItems: FeedEnrichmentItem[] = [];

  items.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<FeedEnrichmentItem>;
    const id = normalizeText(candidate.id);
    const source = toKnownSource(candidate.source);
    const category = toKnownCategory(candidate.category);
    const title = normalizeText(candidate.title);
    const summary = normalizeText(candidate.summary);
    if (candidate.kind !== 'enrichment' || !id || !source || !category || !title || !summary) return;

    const url = toSafeHttpUrl(candidate.url);
    const candidateMediaType = candidate.mediaType === 'image' || candidate.mediaType === 'video'
      ? candidate.mediaType
      : undefined;
    const candidateMediaUrl = toSafeHttpUrl(candidate.mediaUrl);
    const mediaUrl = candidateMediaType === 'video'
      ? (candidateMediaUrl && isDirectVideoUrl(candidateMediaUrl) ? candidateMediaUrl : undefined)
      : candidateMediaType === 'image'
        ? candidateMediaUrl
        : undefined;

    normalizedItems.push({
      id,
      kind: 'enrichment',
      source,
      category,
      title,
      summary,
      ...(url ? { url } : {}),
      ...(mediaUrl && candidateMediaType ? { mediaType: candidateMediaType, mediaUrl } : {}),
      ...(typeof candidate.publishedAt === 'string' ? { publishedAt: candidate.publishedAt } : {}),
    });
  });

  return normalizedItems;
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
