/**
 * In-Memory Page View Cache + Buffered DB Persistence
 * ====================================================
 * Shared between the public track-pageview endpoint and
 * the admin anonymous-visitors endpoint.
 *
 * PAGE_VIEW_CACHE: Resets on deploy — real-time "who's on site now" data.
 * PAGE_VIEW_BUFFER: Batched writes to PostgreSQL every 15s or at 50 records.
 */

import { createHmac } from 'node:crypto';

export const PAGE_VIEW_CACHE = new Map(); // visitorKey -> { geo, lastSeen, pages[], userAgent, ... }
export const PAGE_VIEW_TTL = 24 * 60 * 60 * 1000; // 24h

// ── Buffered DB persistence ──
export const PAGE_VIEW_BUFFER = [];
const FLUSH_INTERVAL = 15000; // 15 seconds
const FLUSH_THRESHOLD = 50;   // records

let flushTimer = null;
let PageViewModel = null; // Lazy-loaded to avoid circular imports

const FALLBACK_ANONYMIZATION_SALT = 'swanstudios-local-page-view-salt';

function getAnonymizationSalt() {
  return (
    process.env.PAGE_VIEW_ANONYMIZATION_SALT ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    FALLBACK_ANONYMIZATION_SALT
  );
}

export function anonymizeVisitorIp(ip) {
  const input = typeof ip === 'string' && ip.trim() ? ip.trim() : 'unknown';
  const digest = createHmac('sha256', getAnonymizationSalt()).update(input).digest('hex');
  return `pv_${digest.slice(0, 32)}`;
}

export function sanitizePagePath(page) {
  if (typeof page !== 'string') return null;
  const trimmed = page.trim();
  if (!trimmed || !trimmed.startsWith('/')) return null;
  return trimmed.split(/[?#]/)[0].slice(0, 200) || null;
}

export function shouldSkipPageViewPath(pagePath) {
  const normalized = sanitizePagePath(pagePath);
  if (!normalized) return true;

  const lowerPath = normalized.toLowerCase();
  if (/^\/dashboard(?:\/|$)/.test(lowerPath)) return true;
  if (/^\/login(?:\/|$)/.test(lowerPath)) return true;
  if (/^\/auth\/(?:register|signup)(?:\/|$)/.test(lowerPath)) return false;
  if (/^\/(?:signup|register)(?:\/|$)/.test(lowerPath)) return false;
  if (/^\/auth(?:\/|$)/.test(lowerPath)) return true;

  return false;
}

export function sanitizeReferrer(referrer) {
  if (typeof referrer !== 'string') return null;
  const trimmed = referrer.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    const withoutQuery = trimmed.split(/[?#]/)[0].slice(0, 200);
    return withoutQuery || null;
  }
}

export function summarizeUserAgent(userAgent) {
  if (typeof userAgent !== 'string' || !userAgent.trim()) return 'unknown';
  const ua = userAgent.toLowerCase();
  const device = /mobile|iphone|android/.test(ua)
    ? 'mobile'
    : /ipad|tablet/.test(ua)
      ? 'tablet'
      : 'desktop';
  const browser = ua.includes('edg/')
    ? 'edge'
    : ua.includes('firefox/')
      ? 'firefox'
      : ua.includes('chrome/')
        ? 'chrome'
        : ua.includes('safari/')
          ? 'safari'
          : 'other';
  return `${device}:${browser}`;
}

/**
 * Push a page view record to the buffer for batched DB write.
 */
export function bufferPageView(entry) {
  PAGE_VIEW_BUFFER.push({
    ip: entry.visitorKey || entry.ip,
    page: entry.pages?.[entry.pages.length - 1] || null,
    referrer: entry.referrer || null,
    userAgent: entry.userAgent || null,
    country: entry.geo?.country || null,
    countryCode: entry.geo?.countryCode || null,
    region: entry.geo?.region || null,
    city: entry.geo?.city || null,
    pageCount: entry.pageCount || 1,
    pages: entry.pages || [],
    firstSeen: new Date(entry.firstSeen),
    lastSeen: new Date(entry.lastSeen),
  });

  if (PAGE_VIEW_BUFFER.length >= FLUSH_THRESHOLD) {
    flushBuffer();
  }
}

/**
 * Flush buffered records to PostgreSQL via bulkCreate.
 */
export async function flushBuffer() {
  if (PAGE_VIEW_BUFFER.length === 0) return;

  const batch = PAGE_VIEW_BUFFER.splice(0, PAGE_VIEW_BUFFER.length);

  try {
    if (!PageViewModel) {
      const mod = await import('../models/PageView.mjs');
      PageViewModel = mod.default;
    }

    await PageViewModel.bulkCreate(batch, { ignoreDuplicates: false });
  } catch (err) {
    // On failure, log but don't crash — data loss is acceptable for analytics
    console.warn('[PageViewBuffer] Flush failed:', err.message);
  }
}

// Start periodic flush timer
function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (PAGE_VIEW_BUFFER.length > 0) {
      flushBuffer();
    }
  }, FLUSH_INTERVAL);

  // Don't keep process alive just for analytics
  if (flushTimer.unref) flushTimer.unref();
}

startFlushTimer();
