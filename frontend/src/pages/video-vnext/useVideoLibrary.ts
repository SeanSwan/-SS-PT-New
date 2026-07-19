/**
 * Video V-next — useVideoLibrary (the data hook). BIND-ONLY: it reuses VideoLibraryV3's PURE logic
 * helpers (`buildVideoListPath` → GET /api/v2/videos, `normalizeVideoCatalogResponse`, pagination) and the
 * same apiService — it never changes the catalog/auth behavior (the VideoCatalogAuthPipeline truth test
 * still governs). V3 stays untouched; this is a self-contained re-wire of the same fetch/state so the new
 * visual layer has its data without editing the shipped V3 component.
 */
import { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api.service';
import type { CollectionItem, VideoItem, VideoPagination } from '../VideoLibraryV3.types';
import {
  DEFAULT_VIDEO_PAGINATION,
  buildVideoListPath,
  normalizeCollectionCatalogResponse,
  normalizeVideoCatalogResponse,
  videoLibraryErrorMeta,
} from '../VideoLibraryV3.logic';

export interface VideoLibraryState {
  videos: VideoItem[];
  collections: CollectionItem[];
  pagination: VideoPagination;
  loading: boolean;
  error: string | null;
  contentType: string;
  activeSearch: string;
  setContentType: (v: string) => void;
  submitSearch: (v: string) => void;
  goToPage: (page: number) => void;
  refetch: () => void;
}

export function useVideoLibrary(): VideoLibraryState {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [pagination, setPagination] = useState<VideoPagination>(DEFAULT_VIDEO_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const fetchVideos = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.get(buildVideoListPath(page, contentType, activeSearch));
        const catalog = normalizeVideoCatalogResponse(res.data);
        setVideos(catalog.videos);
        setPagination(catalog.pagination);
      } catch (err) {
        setError(videoLibraryErrorMeta(err).message);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    },
    [contentType, activeSearch],
  );

  useEffect(() => {
    void fetchVideos(1);
  }, [fetchVideos]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiService.get('/api/v2/videos/collections?limit=6');
        if (alive) setCollections(normalizeCollectionCatalogResponse(res.data).collections);
      } catch {
        if (alive) setCollections([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (page === pagination.page || page < 1 || page > pagination.totalPages) return;
      void fetchVideos(page);
    },
    [pagination.page, pagination.totalPages, fetchVideos],
  );

  return {
    videos,
    collections,
    pagination,
    loading,
    error,
    contentType,
    activeSearch,
    setContentType,
    submitSearch: setActiveSearch,
    goToPage,
    refetch: () => void fetchVideos(pagination.page),
  };
}
