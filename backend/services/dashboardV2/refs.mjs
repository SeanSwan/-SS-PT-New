/**
 * dashboardV2/refs — server-side masking + formatting for Dashboards v2 (KIMI-DASHBOARDS §2.3/§6).
 *
 * PRIVACY (Rule 8): the client never sees a real name or raw id. Every person is shown as a stable,
 * NON-reversible display ref (`C-026122`, `T-004317`) derived by HMAC(id, MASK_SALT). It is deterministic
 * within a deploy (same id → same ref) so the UI is coherent, but it is display-only — you cannot
 * recover the id from the ref. FORMATTING happens here too: every string the client renders is
 * pre-formatted server-side (`value: string // fmt:server`); the client formats nothing.
 */
import crypto from 'crypto';

// Dedicated salts win. Production's required auth secret supplies a domain-separated stable fallback so
// multiple server instances produce the same display refs. Local tools with no secrets get process-local refs.
const configuredSalt = process.env.MASK_SALT || process.env.DASHBOARD_MASK_SALT;
const platformSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const MASK_SALT = configuredSalt
  || (platformSecret
    ? crypto.createHmac('sha256', platformSecret).update('dashboard-v2-display-refs').digest('hex')
    : crypto.randomBytes(32).toString('hex'));

/**
 * Ref space per kind. WIDENED 2026-07-28 (admin-surface audit, SWA-75).
 *
 * The ref was a 4-digit code for every kind — 10,000 possible values. Because a
 * ref REPLACES the person's name in these dashboards, two clients landing on the
 * same code are indistinguishable to the operator, and `dashboardV2Service`
 * additionally uses trainer refs as CHART LABELS, where a collision visually
 * merges two people into one series.
 *
 * Measured against the real HMAC (not theory): 100 clients produced 1 colliding
 * ref, 250 produced 3, 500 produced 13. That is a launch-window problem, not a
 * someday problem.
 *
 * Both kinds get a 6-digit space (1e6). The first attempt at this fix left
 * trainers on the 4-digit space, reasoning that the roster is small — the
 * uniqueness test immediately produced a collision at FIFTY trainers. "Small
 * roster" is not a defence at a 10,000-value space, and trainers are precisely
 * the refs used as chart labels, where a collision merges two series.
 *
 * Safe to change: refs are computed at projection time and never persisted —
 * no DB column stores one, and nothing looks a record up by ref.
 */
const REF_SPACE = { T: 1000000, C: 1000000 };
const REF_WIDTH = { T: 6, C: 6 };

/** Non-reversible display ref: HMAC(id) → fixed-width code with a role-kind prefix. */
export function maskRef(id, kind = 'C') {
  if (id === null || id === undefined) return `${kind}-—`;
  const space = REF_SPACE[kind] ?? REF_SPACE.C;
  const width = REF_WIDTH[kind] ?? REF_WIDTH.C;
  const h = crypto.createHmac('sha256', MASK_SALT).update(String(id)).digest('hex');
  // 8 hex chars (32 bits) so the modulus is not drawn from a 24-bit pool.
  const n = parseInt(h.slice(0, 8), 16) % space; // stable per id
  return `${kind}-${String(n).padStart(width, '0')}`;
}

export const maskClient = (id) => maskRef(id, 'C');
export const maskTrainer = (id) => maskRef(id, 'T');

// Opaque, collision-safe row handle (16 hex) for React keys — never the raw sequential PK. Not shown
// to the user, so length is unconstrained; wide enough to avoid list-key collisions unlike the 4-digit ref.
export function maskId(id, kind = 'sess') {
  if (id === null || id === undefined) return `${kind}-none`;
  return crypto.createHmac('sha256', MASK_SALT).update(`${kind}:${id}`).digest('hex').slice(0, 16);
}

// ---- formatters (server-authoritative) ----
// Order.totalAmount is DECIMAL(10,2) — a DOLLAR amount (Sequelize may return it as a string). We format
// as-is (no /100); the live revenue route sums the same column without dividing.
export const fmtMoney = (dollars) =>
  `$${(Number(dollars || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');

/** Short clock label from a Date (e.g. "9:30 AM"). */
export function fmtTime(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Coarse "how long ago" label from a Date. */
export function fmtAge(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const mins = Math.max(0, Math.round((Date.now() - dt.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Map a raw Session.status to the client-facing SessionRow status union. */
export function sessionRowStatus(raw, sessionDate, attendance, sessionEnd) {
  // no-shows live in Session.attendanceStatus, NOT status — check it first so a no-show reads as "missed".
  if (attendance === 'no_show') return 'missed';
  if (raw === 'completed') return 'done';
  if (raw === 'cancelled') return 'missed';
  const when = sessionDate ? new Date(sessionDate).getTime() : 0;
  if (raw === 'confirmed' || raw === 'scheduled') {
    if (when > Date.now()) return 'upcoming';
    const end = sessionEnd ? new Date(sessionEnd).getTime() : 0;
    if (end && end <= Date.now()) return 'missed';
    if (when) return 'active';
  }
  return 'upcoming';
}

/** Start of today / N-days-ago in server local time, as Date objects. */
export function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}
