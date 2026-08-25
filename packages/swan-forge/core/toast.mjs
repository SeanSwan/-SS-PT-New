/**
 * @swan/forge — headless Toast core: a queue with per-item lifetimes, a11y
 * live-region semantics (polite for info/success, assertive for danger), and
 * pause-on-hover/focus. Pure state machine; the binding owns the timer clock.
 * Zero deps. Core-invariant: announcement politeness + dismiss keyboard path.
 */

export const TOAST_TONES = /** @type {const} */ (['info', 'success', 'warning', 'danger']);

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} tone      info|success|warning|danger
 * @property {string} title
 * @property {string} [body]
 * @property {number} ttl       ms; 0 = sticky (danger defaults sticky)
 * @property {number} remaining ms left (counts down only while not paused)
 * @property {boolean} paused
 */

/**
 * Build a toast. Danger toasts are sticky by default (must be dismissed) —
 * an error that auto-vanishes before it is read is an a11y failure.
 * @param {{id: string, tone?: string, title: string, body?: string, ttl?: number}} input
 * @returns {Toast}
 */
export function createToast(input) {
  const tone = TOAST_TONES.includes(/** @type {any} */ (input.tone)) ? /** @type {string} */ (input.tone) : 'info';
  const ttl = typeof input.ttl === 'number' ? Math.max(0, input.ttl) : tone === 'danger' ? 0 : 6000;
  return { id: String(input.id), tone, title: String(input.title ?? ''), body: input.body, ttl, remaining: ttl, paused: false };
}

/** Queue reducers (immutable). */
export function enqueue(queue, toast, max = 4) {
  const next = [...queue.filter((t) => t.id !== toast.id), toast];
  return next.length > max ? next.slice(next.length - max) : next; // oldest fall off
}
export function dismiss(queue, id) { return queue.filter((t) => t.id !== id); }
export function setPaused(queue, id, paused) { return queue.map((t) => (t.id === id ? { ...t, paused } : t)); }

/**
 * Advance the clock. Sticky (ttl 0) and paused toasts never expire.
 * @param {Toast[]} queue @param {number} elapsedMs
 * @returns {{queue: Toast[], expired: string[]}}
 */
export function tick(queue, elapsedMs) {
  const expired = [];
  const next = [];
  for (const t of queue) {
    if (t.ttl === 0 || t.paused) { next.push(t); continue; }
    const remaining = t.remaining - elapsedMs;
    if (remaining <= 0) expired.push(t.id); else next.push({ ...t, remaining });
  }
  return { queue: next, expired };
}

/** Attribute map for the region that hosts the stack (one per app). */
export function getToastRegionAttrs() {
  return { role: 'region', 'aria-label': 'Notifications', class: 'sw-toast-region' };
}

/** Attribute map for one toast. Danger/warning are assertive + alert; the rest polite + status. */
export function getToastAttrs(toast) {
  const urgent = toast.tone === 'danger' || toast.tone === 'warning';
  return {
    role: urgent ? 'alert' : 'status',
    'aria-live': urgent ? 'assertive' : 'polite',
    'aria-atomic': 'true',
    class: `sw-toast sw-toast--${toast.tone}${toast.paused ? ' is-paused' : ''}`,
    'data-id': toast.id,
  };
}

/** Keyboard reducer: Escape dismisses the focused toast. */
export function handleToastKey(event) {
  return event.key === 'Escape' ? { action: 'dismiss' } : { action: 'none' };
}
