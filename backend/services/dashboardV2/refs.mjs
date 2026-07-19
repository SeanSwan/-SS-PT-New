/**
 * dashboardV2/refs — server-side masking + formatting for Dashboards v2 (KIMI-DASHBOARDS §2.3/§6).
 *
 * PRIVACY (Rule 8): the client never sees a real name or raw id. Every person is shown as a stable,
 * NON-reversible display ref (`C-1042`, `T-07`) derived by HMAC(id, MASK_SALT). It is deterministic
 * within a deploy (same id → same ref) so the UI is coherent, but it is display-only — you cannot
 * recover the id from the ref. FORMATTING happens here too: every string the client renders is
 * pre-formatted server-side (`value: string // fmt:server`); the client formats nothing.
 */
import crypto from 'crypto';

// Display-only salt. A static fallback is acceptable because refs are non-reversible display codes,
// not a security boundary; set MASK_SALT in prod to rotate the ref space. Never logged, never returned.
const MASK_SALT = process.env.MASK_SALT || process.env.DASHBOARD_MASK_SALT || 'swan-dashboard-v2-ref';

/** Non-reversible display ref: HMAC(id) → 4-digit code with a role-kind prefix. */
export function maskRef(id, kind = 'C') {
  if (id === null || id === undefined) return `${kind}-—`;
  const h = crypto.createHmac('sha256', MASK_SALT).update(String(id)).digest('hex');
  const n = parseInt(h.slice(0, 6), 16) % 10000; // 0..9999, stable per id
  return `${kind}-${String(n).padStart(kind === 'T' ? 2 : 4, '0')}`;
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
export function sessionRowStatus(raw, sessionDate) {
  if (raw === 'completed') return 'done';
  if (raw === 'cancelled' || raw === 'no_show') return 'missed';
  const when = sessionDate ? new Date(sessionDate).getTime() : 0;
  if (when && when <= Date.now() && (raw === 'confirmed' || raw === 'scheduled')) return 'active';
  return 'upcoming';
}

/** Start of today / N-days-ago in server local time, as Date objects. */
export function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}
