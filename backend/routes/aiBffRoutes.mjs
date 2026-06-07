/**
 * AI BFF (Backend For Frontend) Aggregator Routes
 * =================================================
 * Prevents "request storm" when AI scans the Command Center dashboard.
 * Aggregates multiple admin endpoints into a single cached response.
 *
 * V3: Stale-while-revalidate pattern for zero-latency cache hits.
 * Uses in-memory cache since Redis is disabled in production.
 */
import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// ── In-Memory Cache ─────────────────────────────────────────────────────────
// (Redis fallback — production has Redis disabled)

const cache = new Map();
const CACHE_TTL_MS = 60000; // 60s
const STALE_THRESHOLD_MS = 30000; // 30s — serve stale + revalidate

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry;
}

function setCache(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

function parsePositiveId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }

  return null;
}

// ── Internal Fetcher ────────────────────────────────────────────────────────

/**
 * Fetch from an internal route handler.
 * This makes internal HTTP-like calls to existing route handlers
 * without actual HTTP overhead.
 *
 * @param {string} path - Internal API path
 * @param {Object} req - Express request (for auth headers)
 * @param {number} timeoutMs - Timeout in ms
 * @returns {Promise<Object>}
 */
async function fetchInternal(path, req, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Hardcoded internal URL — prevents SSRF via Host header manipulation
    const port = process.env.PORT || 10000;
    const url = `http://127.0.0.1:${port}${path}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, status: response.status };
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { error: 'timeout', status: 408 };
    }
    logger.warn('[AI-BFF] Internal fetch failed', { path, error: err.message });
    return { error: 'unavailable', status: 500 };
  }
}

// ── Background Cache Refresh (Tenant-Aware) ─────────────────────────────────
// Each admin user gets their own cache entry + in-flight promise deduplication.
// Prevents cross-tenant data leak where Admin A's auth context fetches for Admin B.

const inFlightRefreshes = new Map(); // userId → Promise

async function refreshCommandCenterCache(req) {
  const userId = req.user?.id;
  if (!userId) throw new Error('User context required for cache refresh');

  // Reuse in-flight refresh for same user
  if (inFlightRefreshes.has(userId)) return inFlightRefreshes.get(userId);

  const promise = _doRefresh(req, userId);
  inFlightRefreshes.set(userId, promise);
  return promise;
}

async function _doRefresh(req, userId) {
  try {
    const [stats, atRisk, kpis, signups] = await Promise.allSettled([
      fetchInternal('/api/admin/dashboard-stats', req, 5000),
      fetchInternal('/api/admin/compliance/at-risk', req, 5000),
      fetchInternal('/api/admin/analytics/business-kpis', req, 5000),
      fetchInternal('/api/admin/recent-signups', req, 5000),
    ]);

    const result = {
      dashboardStats: stats.status === 'fulfilled' ? stats.value : { error: 'unavailable' },
      atRiskClients: atRisk.status === 'fulfilled' ? atRisk.value : { error: 'unavailable' },
      businessKpis: kpis.status === 'fulfilled' ? kpis.value : { error: 'unavailable' },
      recentSignups: signups.status === 'fulfilled' ? signups.value : { error: 'unavailable' },
      fetchedAt: new Date().toISOString(),
      sourcesAvailable: [stats, atRisk, kpis, signups].filter(s => s.status === 'fulfilled').length,
    };

    // Store in tenant-specific cache key
    setCache(`command_center_${userId}`, result);
    return result;
  } catch (err) {
    logger.error('[AI-BFF] Cache refresh failed', { error: err.message, userId });
  } finally {
    inFlightRefreshes.delete(userId);
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ai-bff/command-center
 * Aggregated dashboard data for AI scanning.
 * Cached 60s with stale-while-revalidate at 30s.
 */
router.get('/command-center', protect, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id;
    const cached = getCached(`command_center_${userId}`);

    if (cached) {
      const age = Date.now() - cached.fetchedAt;

      // Fresh cache — serve immediately
      if (age < STALE_THRESHOLD_MS) {
        return res.json(cached.data);
      }

      // Stale cache — serve stale + refresh in background
      if (age < CACHE_TTL_MS) {
        refreshCommandCenterCache(req).catch(err =>
          logger.warn('[AI-BFF] Background refresh failed', { error: err.message })
        );
        return res.json(cached.data);
      }
    }

    // No cache or expired — fetch fresh
    const result = await refreshCommandCenterCache(req);
    if (result) {
      return res.json(result);
    }

    res.status(503).json({ error: 'Dashboard data temporarily unavailable' });
  } catch (err) {
    logger.error('[AI-BFF] Command center route error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/ai-bff/client-summary/:clientId
 * Aggregated client data for AI context (de-identified).
 */
router.get('/client-summary/:clientId', protect, async (req, res) => {
  try {
    const clientId = parsePositiveId(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    // RBAC: clients can only access own data, trainers only assigned clients
    if (req.user.role === 'client' && req.user.id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'trainer') {
      const { ensureClientAccess } = await import('../utils/clientAccess.mjs');
      const access = await ensureClientAccess(req, clientId);
      if (!access.allowed) {
        return res.status(access.status).json({ error: access.message });
      }
    }

    const requesterCacheScope = `${req.user?.role || 'unknown'}_${req.user?.id || 'anonymous'}`;
    const cacheKey = `client_summary_${requesterCacheScope}_${clientId}`;
    const cached = getCached(cacheKey);
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // Fetch client data from multiple endpoints
    const [profile, pain, measurements, workouts] = await Promise.allSettled([
      fetchInternal(`/api/admin/clients/${clientId}`, req, 5000),
      fetchInternal(`/api/pain-entries/${clientId}/active`, req, 5000),
      fetchInternal(`/api/measurements/user/${clientId}/latest`, req, 5000),
      fetchInternal(`/api/admin/clients/${clientId}/workout-stats`, req, 5000),
    ]);

    const result = {
      profile: profile.status === 'fulfilled' ? profile.value : { error: 'unavailable' },
      activePain: pain.status === 'fulfilled' ? pain.value : { error: 'unavailable' },
      latestMeasurements: measurements.status === 'fulfilled' ? measurements.value : { error: 'unavailable' },
      recentWorkouts: workouts.status === 'fulfilled' ? workouts.value : { error: 'unavailable' },
      fetchedAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    logger.error('[AI-BFF] Client summary error', { error: err.message, clientId: req.params.clientId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
