/**
 * ============================================================================
 * FILE: serpApiService.mjs
 * PURPOSE: Swan Oracle — SerpAPI integration for fitness content feeds
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches curated fitness/exercise science content from
 * Google Scholar, Google News, YouTube, and Google Trends via SerpAPI.
 * All queries are fitness-scoped — no politics, no general news.
 *
 * HOW IT FITS IN THE APP: oracleRoutes → serpApiService → SerpAPI → cache
 *
 * KEY DECISIONS: Aggressive caching (1-6 hours) to stay within API quota.
 * Every query appends fitness qualifiers to guarantee relevant results.
 */

import logger from '../utils/logger.mjs';
import cache from './cache/redisWrapper.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Config
// PURPOSE: API key + base URL + cache TTLs
// WHY: Centralized config so quota tuning is easy
// ─────────────────────────────────────────────────────────────
const SERPAPI_BASE = 'https://serpapi.com/search.json';
const getApiKey = () => process.env.SWAN_ORACLE_API_KEY || '';

// Cache TTLs in seconds
const CACHE_TTL = {
  scholar: 21600,   // 6 hours — academic papers don't change fast
  news: 3600,       // 1 hour — fitness news refreshes more often
  youtube: 7200,    // 2 hours — video results are stable
  trends: 14400,    // 4 hours — trends shift slowly
};

// ─────────────────────────────────────────────────────────────
// SECTION: Fitness-Scoped Query Builder
// PURPOSE: Ensures every search stays in the fitness/exercise domain
// WHY: User requirement — no politics, no depressing news, fitness only
// ─────────────────────────────────────────────────────────────
const FITNESS_QUALIFIERS = [
  'exercise', 'fitness', 'strength training', 'NASM', 'workout',
  'resistance training', 'sports science', 'physical therapy',
];

function buildFitnessQuery(userQuery) {
  const lower = userQuery.toLowerCase();
  const hasFitnessContext = FITNESS_QUALIFIERS.some(q => lower.includes(q));
  return hasFitnessContext ? userQuery : `${userQuery} exercise fitness`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Core Fetch with Cache
// PURPOSE: DRY fetch wrapper with cache-first strategy
// WHY: SerpAPI has quota limits — cache aggressively
// ─────────────────────────────────────────────────────────────
async function cachedFetch(cacheKey, ttl, params) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'Oracle service unavailable' };
  }

  // Check cache first — wrap parse in try/catch to survive corrupted entries
  const cached = await cache.get(cacheKey);
  if (cached) {
    try {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { ok: true, data, fromCache: true };
    } catch (e) {
      logger.warn(`[SwanOracle] Cache parse failed for ${cacheKey}, fetching fresh.`);
    }
  }

  try {
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set('api_key', apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value != null) url.searchParams.set(key, String(value));
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      logger.error(`[SwanOracle] SerpAPI ${params.engine} failed (${res.status}): ${text}`);
      return { ok: false, error: `SerpAPI returned ${res.status}` };
    }

    const data = await res.json();
    await cache.set(cacheKey, JSON.stringify(data), ttl);
    return { ok: true, data, fromCache: false };
  } catch (err) {
    logger.error(`[SwanOracle] ${params.engine} fetch error:`, err.message);
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Google Scholar — Exercise Science Research
// PURPOSE: Academic papers on exercise physiology, biomechanics, NASM protocols
// WHY: Trainer teaching widgets need evidence-based content
// ─────────────────────────────────────────────────────────────

/**
 * Search Google Scholar for exercise science papers.
 * @param {string} query - Search term (e.g., "squat biomechanics")
 * @param {number} num - Number of results (default 5)
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
export async function searchScholar(query, num = 5) {
  const fitnessQuery = buildFitnessQuery(query);
  const cacheKey = `oracle:scholar:${fitnessQuery}`;

  const result = await cachedFetch(cacheKey, CACHE_TTL.scholar, {
    engine: 'google_scholar',
    q: fitnessQuery,
    num,
  });

  if (!result.ok) return result;

  // Extract clean article list
  const articles = (result.data.organic_results || []).map(r => ({
    title: r.title,
    snippet: r.snippet,
    link: r.link,
    authors: r.publication_info?.summary || '',
    citedBy: r.inline_links?.cited_by?.total || 0,
  }));

  return { ok: true, data: articles, fromCache: result.fromCache };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Google News — Fitness News Only
// PURPOSE: Latest fitness industry news, no politics/general news
// WHY: Social explore tab needs curated fitness content
// ─────────────────────────────────────────────────────────────

/**
 * Search Google News for fitness-only articles.
 * @param {string} query - Topic (e.g., "NASM certification", "strength training research")
 * @param {number} num - Number of results (default 8)
 */
export async function searchFitnessNews(query, num = 8) {
  // Force fitness context to prevent politics/general news
  const fitnessQuery = `${buildFitnessQuery(query)} -politics -election -war -crime`;
  const cacheKey = `oracle:news:${fitnessQuery}`;

  const result = await cachedFetch(cacheKey, CACHE_TTL.news, {
    engine: 'google_news',
    q: fitnessQuery,
    gl: 'us',
    hl: 'en',
  });

  if (!result.ok) return result;

  const articles = (result.data.news_results || []).slice(0, num).map(r => ({
    title: r.title,
    snippet: r.snippet || '',
    link: r.link,
    source: r.source?.name || '',
    date: r.date || '',
    thumbnail: r.thumbnail || null,
  }));

  return { ok: true, data: articles, fromCache: result.fromCache };
}

// ─────────────────────────────────────────────────────────────
// SECTION: YouTube — Training Videos
// PURPOSE: Exercise demonstration and coaching videos
// WHY: Teach Mode needs visual references for exercise technique
// ─────────────────────────────────────────────────────────────

/**
 * Search YouTube for exercise/training videos.
 * @param {string} query - Exercise name or topic
 * @param {number} num - Number of results (default 5)
 */
export async function searchYouTube(query, num = 5) {
  const fitnessQuery = buildFitnessQuery(query);
  const cacheKey = `oracle:youtube:${fitnessQuery}`;

  const result = await cachedFetch(cacheKey, CACHE_TTL.youtube, {
    engine: 'youtube',
    search_query: fitnessQuery,
  });

  if (!result.ok) return result;

  const videos = (result.data.video_results || []).slice(0, num).map(v => ({
    title: v.title,
    link: v.link,
    channel: v.channel?.name || '',
    views: v.views || 0,
    length: v.length || '',
    thumbnail: v.thumbnail?.static || v.thumbnail || null,
    description: v.description || '',
  }));

  return { ok: true, data: videos, fromCache: result.fromCache };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Google Trends — Fitness Market Intelligence
// PURPOSE: Trending fitness topics for admin business intel
// WHY: Helps Sean understand market demand + client interests
// ─────────────────────────────────────────────────────────────

/**
 * Get Google Trends data for fitness keywords.
 * @param {string} query - Keyword to trend-check
 */
export async function searchTrends(query) {
  const fitnessQuery = buildFitnessQuery(query);
  const cacheKey = `oracle:trends:${fitnessQuery}`;

  const result = await cachedFetch(cacheKey, CACHE_TTL.trends, {
    engine: 'google_trends',
    q: fitnessQuery,
    data_type: 'TIMESERIES',
    date: 'today 3-m',
  });

  if (!result.ok) return result;

  const interest = (result.data.interest_over_time?.timeline_data || []).map(t => ({
    date: t.date,
    values: t.values?.map(v => ({ query: v.query, value: v.extracted_value })) || [],
  }));

  const related = (result.data.related_queries?.rising || []).slice(0, 5).map(r => ({
    query: r.query,
    value: r.extracted_value || r.value,
  }));

  return {
    ok: true,
    data: { interest, relatedQueries: related },
    fromCache: result.fromCache,
  };
}

export default {
  searchScholar,
  searchFitnessNews,
  searchYouTube,
  searchTrends,
};
