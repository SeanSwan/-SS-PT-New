import { buildProviderItems } from './feedEnrichmentProviderAdapters.mjs';

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3500;
const MAX_LIMIT = 10;
const DEFAULT_USER_AGENT = 'SwanStudiosDashboard/1.0 (https://sswanstudios.com)';

let enrichmentCache = {
  expiresAt: 0,
  items: [],
};

const bannedTerms = [
  'campaign',
  'diagnosis',
  'election',
  'injury cure',
  'medical advice',
  'partisan',
  'politic',
  'prescription',
  'shooting',
  'violence',
  'war',
];

const allowedSources = new Set([
  'nasa-images',
  'smithsonian',
  'nps',
  'wikimedia-commons',
  'swan-curated',
]);

const allowedCategories = new Set([
  'space',
  'nature',
  'parks',
  'culture',
  'movement',
  'growth',
]);

const curatedSparks = [
  {
    source: 'swan-curated',
    category: 'movement',
    title: 'One clean rep is still progress',
    summary: 'When the feed is quiet, the next useful move is simple: log the work, keep the streak honest, and build from there.',
  },
  {
    source: 'swan-curated',
    category: 'growth',
    title: 'Strong weeks are built in small blocks',
    summary: 'A short walk, a focused lift, or a flexibility reset can keep momentum alive without making the dashboard noisy.',
  },
  {
    source: 'swan-curated',
    category: 'nature',
    title: 'Plants grow by repeating the basics',
    summary: 'Water, light, recovery, and time. Training works the same way when the inputs stay consistent.',
  },
  {
    source: 'swan-curated',
    category: 'space',
    title: 'Tiny signals can reveal huge systems',
    summary: 'Astronomers read faint light to understand deep space. Your logs do the same for training progress.',
  },
  {
    source: 'swan-curated',
    category: 'parks',
    title: 'A trail starts as one decision',
    summary: 'Outdoor momentum does not need a perfect day. Pick a window, move with intention, and let the next log remember it.',
  },
];

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const clampLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
};

const truncate = (value, maxLength = 180) => {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const toSafeHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const isDirectVideoUrl = (value) => {
  const safeUrl = toSafeHttpUrl(value);
  if (!safeUrl) return false;
  return /\.(mp4|webm|ogg)$/i.test(new URL(safeUrl).pathname);
};

export const makeCuratedFeedEnrichmentItems = (nowMs) => curatedSparks.map((spark, index) => ({
  id: `swan-curated-${index + 1}`,
  kind: 'enrichment',
  source: spark.source,
  category: spark.category,
  title: spark.title,
  summary: spark.summary,
  publishedAt: new Date(nowMs - index * 60_000).toISOString(),
}));

export const clearFeedEnrichmentCache = () => {
  enrichmentCache = {
    expiresAt: 0,
    items: [],
  };
};

export const moderateEnrichmentItem = (item) => {
  if (!item || typeof item !== 'object') return null;
  const id = typeof item.id === 'string' ? normalizeWhitespace(item.id) : '';
  const title = normalizeWhitespace(item.title);
  const summary = normalizeWhitespace(item.summary);
  if (!id || !title || !summary) return null;

  const haystack = `${title} ${summary}`.toLowerCase();
  if (bannedTerms.some((term) => haystack.includes(term))) return null;

  const source = String(item.source || '');
  const category = String(item.category || '');
  if (!allowedSources.has(source) || !allowedCategories.has(category)) return null;

  const url = toSafeHttpUrl(item.url);
  const candidateMediaType = item.mediaType === 'video' || item.mediaType === 'image'
    ? item.mediaType
    : undefined;
  const candidateMediaUrl = toSafeHttpUrl(item.mediaUrl);
  const mediaUrl = candidateMediaType === 'video'
    ? (candidateMediaUrl && isDirectVideoUrl(candidateMediaUrl) ? candidateMediaUrl : undefined)
    : candidateMediaType === 'image'
      ? candidateMediaUrl
      : undefined;
  const mediaType = mediaUrl ? candidateMediaType : undefined;

  return {
    id,
    kind: 'enrichment',
    source,
    category,
    title: truncate(title, 96),
    summary: truncate(summary, 220),
    ...(url ? { url } : {}),
    ...(mediaUrl && mediaType ? { mediaType, mediaUrl } : {}),
    ...(typeof item.publishedAt === 'string' ? { publishedAt: item.publishedAt } : {}),
  };
};

const fetchJsonDefault = async (url, { env = process.env } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': env.SWAN_FEED_USER_AGENT || DEFAULT_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`provider returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

export const buildFeedEnrichmentItems = async ({
  fetchJson = fetchJsonDefault,
  nowMs = Date.now(),
  env = process.env,
  limit = 5,
} = {}) => {
  const safeLimit = clampLimit(limit);
  if (enrichmentCache.expiresAt > nowMs && enrichmentCache.items.length > 0) {
    return {
      items: enrichmentCache.items.slice(0, safeLimit),
      cacheStatus: 'hit',
    };
  }

  const providerItems = await buildProviderItems({
    fetchJson,
    nowMs,
    env,
    moderate: moderateEnrichmentItem,
  });
  const fallbackItems = makeCuratedFeedEnrichmentItems(nowMs);
  const merged = [...providerItems, ...fallbackItems]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, MAX_LIMIT);

  enrichmentCache = {
    expiresAt: nowMs + CACHE_TTL_MS,
    items: merged,
  };

  return {
    items: merged.slice(0, safeLimit),
    cacheStatus: 'miss',
  };
};

export const getFeedEnrichmentLimit = clampLimit;
