/**
 * In-Memory Page View Cache
 * =========================
 * Shared between the public track-pageview endpoint and
 * the admin anonymous-visitors endpoint.
 * Resets on deploy (intentional — this is real-time "who's on site now" data).
 */

export const PAGE_VIEW_CACHE = new Map(); // ip -> { geo, lastSeen, pages[], userAgent, ... }
export const PAGE_VIEW_TTL = 24 * 60 * 60 * 1000; // 24h
