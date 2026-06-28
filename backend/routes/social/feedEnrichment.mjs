import express from 'express';

const router = express.Router();

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3500;
const MAX_LIMIT = 10;

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
    summary: 'A short walk, a focused lift, or a mobility reset can keep momentum alive without making the dashboard noisy.',
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
    category: 'motivation',
    title: 'Make today easy to repeat',
    summary: 'The best plan is the one you can return to tomorrow with useful data and a clear next step.',
  },
];

const clampLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
};

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const truncate = (value, maxLength = 180) => {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const toIsoDate = (value, nowMs) => {
  const parsed = value ? Date.parse(String(value)) : NaN;
  return new Date(Number.isFinite(parsed) ? parsed : nowMs).toISOString();
};

const makeCuratedItems = (nowMs) => curatedSparks.map((spark, index) => ({
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
  const title = normalizeWhitespace(item.title);
  const summary = normalizeWhitespace(item.summary);
  if (!title || !summary) return null;

  const haystack = `${title} ${summary}`.toLowerCase();
  if (bannedTerms.some((term) => haystack.includes(term))) return null;

  return {
    ...item,
    kind: 'enrichment',
    title: truncate(title, 96),
    summary: truncate(summary, 220),
  };
};

const fetchJsonDefault = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`provider returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const buildNasaItem = async ({ fetchJson, env, nowMs }) => {
  const apiKey = env.NASA_API_KEY || 'DEMO_KEY';
  const data = await fetchJson(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`);
  return moderateEnrichmentItem({
    id: `nasa-apod-${data.date || new Date(nowMs).toISOString().slice(0, 10)}`,
    kind: 'enrichment',
    source: 'nasa-apod',
    category: 'space',
    title: data.title,
    summary: data.explanation,
    mediaType: data.media_type === 'video' ? 'video' : 'image',
    mediaUrl: data.hdurl || data.url,
    url: data.url,
    publishedAt: toIsoDate(data.date, nowMs),
  });
};

const buildNatureItem = async ({ fetchJson, nowMs }) => {
  const data = await fetchJson('https://api.inaturalist.org/v1/observations?quality_grade=research&photos=true&order_by=observed_on&per_page=1');
  const observation = Array.isArray(data.results) ? data.results[0] : null;
  if (!observation) return null;
  const commonName = observation.taxon?.preferred_common_name || observation.taxon?.name || 'Nature observation';
  const photoUrl = observation.photos?.[0]?.url ? String(observation.photos[0].url).replace('square', 'medium') : undefined;
  return moderateEnrichmentItem({
    id: `inaturalist-${observation.id}`,
    kind: 'enrichment',
    source: 'inaturalist',
    category: 'nature',
    title: `${commonName} spotted today`,
    summary: `A real research-grade nature observation to keep the feed light, curious, and grounded outside the gym.`,
    mediaType: photoUrl ? 'image' : undefined,
    mediaUrl: photoUrl,
    url: observation.uri,
    publishedAt: toIsoDate(observation.observed_on, nowMs),
  });
};

const buildQuoteItem = async ({ fetchJson, nowMs }) => {
  const data = await fetchJson('https://api.quotable.io/random?tags=inspirational|success');
  const content = data.content || 'Small steady steps make the trail visible.';
  const author = data.author ? ` - ${data.author}` : '';
  return moderateEnrichmentItem({
    id: `quotable-${nowMs}`,
    kind: 'enrichment',
    source: 'quotable',
    category: 'motivation',
    title: 'Momentum cue',
    summary: `${content}${author}`,
    publishedAt: new Date(nowMs).toISOString(),
  });
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

  const providerResults = await Promise.allSettled([
    buildNasaItem({ fetchJson, env, nowMs }),
    buildNatureItem({ fetchJson, env, nowMs }),
    buildQuoteItem({ fetchJson, env, nowMs }),
  ]);

  const providerItems = providerResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter(Boolean)
    .map(moderateEnrichmentItem)
    .filter(Boolean);
  const fallbackItems = makeCuratedItems(nowMs);
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

router.get('/', async (req, res) => {
  try {
    const result = await buildFeedEnrichmentItems({
      limit: req.query.limit,
      env: process.env,
    });
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      items: result.items,
      cacheStatus: result.cacheStatus,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Feed enrichment failed:', error);
    const fallbackItems = makeCuratedItems(Date.now()).slice(0, clampLimit(req.query.limit));
    res.status(200).json({
      items: fallbackItems,
      cacheStatus: 'fallback',
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;