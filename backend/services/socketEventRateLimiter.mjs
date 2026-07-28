/**
 * FILE: socketEventRateLimiter.mjs
 * PURPOSE: Small per-process Socket.IO event limiter for authenticated user events.
 */

const eventHits = new Map();

export function isSocketRateLimited({ userId, event, limit, windowMs, now = Date.now() }) {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0 || !event) return true;
  const key = `${event}:${normalizedUserId}`;
  const freshHits = (eventHits.get(key) || []).filter((hitAt) => now - hitAt < windowMs);
  if (freshHits.length >= limit) {
    eventHits.set(key, freshHits);
    return true;
  }
  freshHits.push(now);
  eventHits.set(key, freshHits);
  return false;
}

export function resetSocketEventRateLimiter() {
  eventHits.clear();
}