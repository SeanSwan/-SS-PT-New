/**
 * ============================================================================
 * FILE: messageRateLimit.mjs
 * PURPOSE: Per-user send throttle shared by BOTH messaging send paths.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-28 (launch audit S9, SWA-75)
 * ============================================================================
 *
 * THE GAP THIS CLOSES
 * Message send had NO rate limit anywhere:
 *   - REST   controllers/messaging/messageController.mjs sendMessage
 *   - SOCKET socket/socket.mjs 'send_message'
 * Auth, registration, password reset, uploads and the AI endpoints are all
 * limited; messaging was not. With a 5,000-character cap and no throttle, one
 * authenticated account could flood a conversation as fast as the network
 * allows. On a platform serving minors that is a harassment vector, not just a
 * capacity concern.
 *
 * WHY IT LIVES HERE RATHER THAN AS express-rate-limit MIDDLEWARE
 * The socket handler is a complete second way to send and never passes through
 * Express middleware. A REST-only limiter would be trivially bypassed by
 * emitting `send_message` over the websocket. Both paths call this.
 *
 * SHAPE
 * Two sliding windows per user — a burst window and an hourly ceiling. Keyed by
 * user id, not IP: the abuse we care about is an authenticated account, and
 * shared-NAT clients (a gym's wifi) must not throttle each other.
 *
 * IN-MEMORY, PER-INSTANCE — stated plainly rather than implied. On multiple
 * Render instances each holds its own counters, so the effective ceiling is
 * limit x instances. That is acceptable for a throttle whose job is to stop
 * flooding, not to meter billing. If messaging ever needs exact global limits,
 * this moves to Redis; the call sites do not change.
 *
 * FAIL-OPEN by construction: any unexpected state allows the send. A throttle
 * must never become the reason messaging is down.
 * ============================================================================
 */

const num = (raw, fallback) => {
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const BURST_WINDOW_MS = num(process.env.MESSAGE_BURST_WINDOW_MS, 60 * 1000);
export const BURST_MAX = num(process.env.MESSAGE_BURST_MAX, 30);
export const HOURLY_WINDOW_MS = num(process.env.MESSAGE_HOURLY_WINDOW_MS, 60 * 60 * 1000);
export const HOURLY_MAX = num(process.env.MESSAGE_HOURLY_MAX, 600);

/** userId -> number[] of send timestamps (ms), pruned on read. */
const sends = new Map();

/** Stop the map growing without bound when many users send once and leave. */
const MAX_TRACKED_USERS = 10_000;

/**
 * Is this entry currently at or over a limit? Such an entry must survive
 * eviction — dropping it hands an actively-throttled sender a fresh budget.
 */
function isThrottled(timestamps, now) {
  if (timestamps.length >= HOURLY_MAX) return true;
  const cutoff = now - BURST_WINDOW_MS;
  let burst = 0;
  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    if (timestamps[i] > cutoff) burst += 1;
    else break;
  }
  return burst >= BURST_MAX;
}

/**
 * Evict one entry to stay bounded, preferring a victim that is NOT currently
 * throttled. Scans a bounded window from the least-recently-used end so this
 * stays O(1)-ish; if every candidate in that window is throttled we fall back
 * to the LRU entry rather than growing without limit.
 *
 * Why this exists: plain LRU eviction reset an actively-throttled sender's
 * budget under enough traffic. Confirmed by adversarial probe, not theory —
 * the first LRU-only attempt at this fix still failed the test.
 */
const EVICTION_SCAN = 64;
function evictOne(now) {
  let fallback;
  let scanned = 0;
  for (const [k, ts] of sends) {
    if (fallback === undefined) fallback = k;
    if (!isThrottled(ts, now)) {
      sends.delete(k);
      return;
    }
    if (++scanned >= EVICTION_SCAN) break;
  }
  if (fallback !== undefined) sends.delete(fallback);
}

function prune(timestamps, now) {
  const cutoff = now - HOURLY_WINDOW_MS;
  let i = 0;
  while (i < timestamps.length && timestamps[i] <= cutoff) i += 1;
  return i === 0 ? timestamps : timestamps.slice(i);
}

/**
 * Record and evaluate a send attempt.
 * @returns {{allowed: boolean, reason?: 'burst'|'hourly', retryAfterMs?: number}}
 */
export function checkMessageRate(userId, now = Date.now()) {
  const key = Number.parseInt(userId, 10);
  // Unknown/!valid id: allow. Identity is enforced upstream; this is a throttle.
  if (!Number.isInteger(key) || key <= 0) return { allowed: true };

  const existing = sends.get(key) || [];
  const recent = prune(existing, now);

  const hourlyCount = recent.length;
  const burstCutoff = now - BURST_WINDOW_MS;
  let burstCount = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    if (recent[i] > burstCutoff) burstCount += 1;
    else break;
  }

  // Re-insert on EVERY touch so Map iteration order is genuinely
  // least-recently-used. `Map.set` on an existing key does NOT reorder it, so
  // without the delete the "oldest" key below is merely the first-ever-seen
  // user — evicting them resets an ACTIVE sender's budget and hands them a
  // fresh burst. Found by adversarial probe during hostile review 2026-07-28.
  const touch = (timestamps) => {
    sends.delete(key);
    // An entry whose window has fully expired carries no information; dropping
    // it keeps the map bounded by ACTIVE senders instead of growing with every
    // user who has ever sent a message in this process.
    if (timestamps.length > 0) sends.set(key, timestamps);
  };

  if (burstCount >= BURST_MAX) {
    touch(recent);
    const oldestInBurst = recent[recent.length - burstCount];
    return {
      allowed: false,
      reason: 'burst',
      retryAfterMs: Math.max(0, oldestInBurst + BURST_WINDOW_MS - now),
    };
  }

  if (hourlyCount >= HOURLY_MAX) {
    touch(recent);
    return {
      allowed: false,
      reason: 'hourly',
      retryAfterMs: Math.max(0, recent[0] + HOURLY_WINDOW_MS - now),
    };
  }

  recent.push(now);

  if (!sends.has(key) && sends.size >= MAX_TRACKED_USERS) {
    evictOne(now);
  }
  touch(recent);

  return { allowed: true };
}

/** Test seam — never called by runtime code. */
export function __resetMessageRateLimit() {
  sends.clear();
}

export const MESSAGE_RATE_LIMITED = 'You are sending messages too quickly. Please wait a moment.';

export default checkMessageRate;
