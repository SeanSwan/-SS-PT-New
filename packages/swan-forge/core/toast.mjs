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

/**
 * Queue reducers (immutable). Newest is LAST in the array; bindings render in
 * array order (DOM order == visual order — never `column-reverse`, R3).
 * Cap eviction: sticky (ttl 0) toasts are EVICTION-IMMUNE — a burst of info
 * toasts must never displace an unread error (panel round 6, GLM T4 / Ox #1).
 */
export function enqueue(queue, toast, max = 4) {
  let next = [...queue.filter((t) => t.id !== toast.id), toast];
  while (next.length > max) {
    const victim = next.findIndex((t) => t.ttl !== 0 && t.id !== toast.id);
    if (victim < 0) break; // only sticky toasts remain: exceed the cap rather than lose an error
    next = next.filter((_, i) => i !== victim);
  }
  return next;
}
export function dismiss(queue, id) { return queue.filter((t) => t.id !== id); }
/**
 * Dismiss with a FOCUS contract (panel round 6, GLM T5): when the dismissed toast
 * had focus, the binding focuses `focusNext` — the next toast in order, else the
 * previous, else `'region'` (return focus to where the toast was invoked / the
 * region's host). Keyboard users are never dropped to <body>.
 * @returns {{queue: Toast[], focusNext: string|'region'}}
 */
export function dismissWithFocus(queue, id) {
  const i = queue.findIndex((t) => t.id === id);
  const next = dismiss(queue, id);
  if (i < 0 || !next.length) return { queue: next, focusNext: 'region' };
  const candidate = next[i] ?? next[i - 1];
  return { queue: next, focusNext: candidate ? candidate.id : 'region' };
}
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

/**
 * Attribute map for the region that hosts the stack (one per app).
 * BINDING DUTIES (core contract, panel round 6 GLM T6/T7): the region element is
 * PERSISTENT (mount once at app start — VoiceOver/Safari announce only into live
 * regions that already exist); each toast is inserted WITH its content in one
 * mutation (an empty node populated later is silent); every toast is focusable
 * (`tabindex="0"`) so keyboard/AT users can pause and dismiss it, not only pointer users.
 */
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
    tabindex: '0',
    class: `sw-toast sw-toast--${toast.tone}${toast.paused ? ' is-paused' : ''}`,
    'data-id': toast.id,
  };
}

/**
 * Keyboard reducer: Escape dismisses the toast that has focus. The binding passes
 * the focused toast's id so the API never has to guess (panel round 6, Ox §5).
 * @param {{key: string}} event @param {string} focusedId
 */
export function handleToastKey(event, focusedId) {
  return event.key === 'Escape' && focusedId ? { action: 'dismiss', id: focusedId } : { action: 'none', id: null };
}
