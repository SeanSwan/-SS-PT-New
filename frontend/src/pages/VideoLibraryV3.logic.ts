import type { CollectionItem, VideoItem, VideoPagination } from './VideoLibraryV3.types';

export const VIDEO_LIBRARY_LOAD_ERROR =
  'Video library is temporarily unavailable. Please try again shortly.';

export const VIDEO_COLLECTIONS_LOAD_ERROR =
  'Video collections are temporarily unavailable. The main library is still available.';

export const DEFAULT_VIDEO_PAGINATION: VideoPagination = {
  page: 1,
  totalPages: 1,
  total: 0,
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asNullableString = (value: unknown) => {
  if (typeof value !== 'string') return null;
  return value.trim() ? value : null;
};

const asNonNegativeInteger = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.floor(next) : fallback;
};

const asBoolean = (value: unknown) => value === true;

const normalizePagination = (value: unknown): VideoPagination => {
  if (!isRecord(value)) return DEFAULT_VIDEO_PAGINATION;
  const totalPages = Math.max(1, asNonNegativeInteger(value.totalPages, DEFAULT_VIDEO_PAGINATION.totalPages));
  const page = Math.max(1, asNonNegativeInteger(value.page, DEFAULT_VIDEO_PAGINATION.page));

  return {
    page: Math.min(page, totalPages),
    totalPages,
    total: asNonNegativeInteger(value.total, DEFAULT_VIDEO_PAGINATION.total),
  };
};

const normalizeVideo = (value: unknown): VideoItem | null => {
  if (!isRecord(value)) return null;

  const id = asString(value.id).trim();
  const slug = asString(value.slug).trim();
  const title = asString(value.title).trim();

  if (!id || !slug || !title) return null;

  return {
    id,
    title,
    slug,
    description: asString(value.description),
    source: value.source === 'youtube' ? 'youtube' : 'upload',
    contentType: asString(value.contentType),
    visibility: asString(value.visibility),
    accessTier: asString(value.accessTier),
    thumbnail: asNullableString(value.thumbnail),
    durationSeconds: asNonNegativeInteger(value.durationSeconds),
    viewCount: asNonNegativeInteger(value.viewCount),
    likeCount: asNonNegativeInteger(value.likeCount),
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    featured: asBoolean(value.featured),
    publishedAt: asString(value.publishedAt),
    youtubeVideoId: asNullableString(value.youtubeVideoId),
    locked: asBoolean(value.locked),
  };
};

const normalizeCollection = (value: unknown): CollectionItem | null => {
  if (!isRecord(value)) return null;

  const id = asString(value.id).trim();
  const slug = asString(value.slug).trim();
  const title = asString(value.title).trim();

  if (!id || !slug || !title) return null;

  return {
    id,
    title,
    slug,
    description: asString(value.description),
    type: asString(value.type),
    visibility: asString(value.visibility),
    accessTier: asString(value.accessTier),
    thumbnail: asNullableString(value.thumbnail),
    videoCount: asNonNegativeInteger(value.videoCount),
    sortOrder: asNonNegativeInteger(value.sortOrder),
  };
};

export const normalizeVideoCatalogResponse = (payload: unknown) => {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) return null;

  return {
    videos: Array.isArray(payload.data.videos)
      ? payload.data.videos.map(normalizeVideo).filter((video): video is VideoItem => Boolean(video))
      : [],
    pagination: normalizePagination(payload.data.pagination),
  };
};

export const normalizeCollectionCatalogResponse = (payload: unknown) => {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) return null;

  return Array.isArray(payload.data.collections)
    ? payload.data.collections
        .map(normalizeCollection)
        .filter((collection): collection is CollectionItem => Boolean(collection))
    : [];
};

export const formatDuration = (seconds: number) => {
  const safeSeconds = asNonNegativeInteger(seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
};

export const normalizeContentTypeLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'All Content';

  return trimmed
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
};

export const hasActiveVideoFilters = (contentType = '', activeSearch = '') =>
  Boolean(contentType.trim() || activeSearch.trim());

export const buildVideoListPath = (page = 1, contentType = '', activeSearch = '') => {
  const safePage = Math.max(1, asNonNegativeInteger(page, 1));
  const params = new URLSearchParams({ page: String(safePage), limit: '20' });
  const trimmedType = contentType.trim();
  const trimmedSearch = activeSearch.trim();

  if (trimmedType) params.set('contentType', trimmedType);
  if (trimmedSearch) params.set('search', trimmedSearch);

  return `/api/v2/videos?${params}`;
};

export const getVisiblePaginationPages = (
  pagination: VideoPagination,
  maxVisible = 7
) => {
  const totalPages = Math.max(1, asNonNegativeInteger(pagination.totalPages, 1));
  const currentPage = Math.min(
    Math.max(1, asNonNegativeInteger(pagination.page, 1)),
    totalPages
  );
  const visibleLimit = Math.max(1, Math.floor(maxVisible));

  if (totalPages <= visibleLimit) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  let distance = 1;

  while (pages.size < visibleLimit && distance < totalPages) {
    if (currentPage - distance > 1) pages.add(currentPage - distance);
    if (currentPage + distance < totalPages) pages.add(currentPage + distance);
    distance += 1;
  }

  return [...pages].sort((a, b) => a - b);
};

export const videoLibraryErrorMeta = (error: unknown) => {
  if (!isRecord(error)) return { status: undefined, code: undefined };
  const response = isRecord(error.response) ? error.response : {};

  return {
    status: typeof response.status === 'number' ? response.status : undefined,
    code: typeof error.code === 'string' ? error.code : undefined,
  };
};

const safePathSegment = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? encodeURIComponent(trimmed) : null;
};

export const getVideoWatchPath = (slug: string) => {
  const segment = safePathSegment(slug);
  return segment ? `/watch/${segment}` : null;
};

export const getCollectionPath = (slug: string) => {
  const segment = safePathSegment(slug);
  return segment ? `/collections/${segment}` : null;
};
