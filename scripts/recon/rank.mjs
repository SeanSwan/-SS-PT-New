/**
 * recon/rank.mjs -- triage scoring + verdict assignment.
 *
 * 409 refs cannot each get a deep review. Cheap signals rank everything;
 * only the top N earn expensive analysis. Rank NEVER reads upstream:track.
 */

import { EQUIV, CONF } from './equivalence.mjs';

export const VERDICT = {
  LANDED: 'already-landed',
  SUPERSEDED: 'superseded',
  UPGRADE: 'genuine-upgrade',
  REGRESSION_RISK: 'regression-risk',
  WIP: 'incomplete-WIP',
  CONFLICTING: 'conflicting',
  COST: 'unmergeable-by-cost',
  ACTIVE_LANE: 'active-lane',
  EXPERIMENTAL: 'experimental',
  UNKNOWN: 'unknown',
};

/** Paths where being wrong is expensive. Drives both ranking and aging policy. */
const SENSITIVE = [
  // identity / access
  /auth/i, /login/i, /signin/i, /signup/i, /password/i, /credential/i, /token/i,
  /jwt/i, /oauth/i, /sso/i, /mfa/i, /2fa/i, /verify/i, /reset/i,
  /(^|\/)admin/i, /permission/i, /role/i, /acl/i, /guard/i, /gate/i, /policy/i,
  /tenant/i, /impersonat/i, /viewas/i, /view-as/i, /owner/i,
  // money
  /payment/i, /stripe/i, /cart/i, /checkout/i, /billing/i, /invoice/i, /refund/i,
  /price/i, /pricing/i, /subscription/i, /coupon/i, /discount/i, /payout/i, /order/i,
  /ach\b/i, /charge/i, /wallet/i, /ledger/i,
  // data exposure
  /webhook/i, /session/i, /middleware/i, /security/i, /crypt/i, /secret/i,
  /pii/i, /gdpr/i, /consent/i, /privacy/i, /sanitiz/i, /redact/i,
  /upload/i, /download/i, /export/i, /migration/i, /seed/i,
  // infra that changes who can reach what
  /cors/i, /csrf/i, /helmet/i, /ratelimit/i, /rate-limit/i, /\.env/i,
  /server\.(mjs|js|ts)$/i, /app\.(mjs|js|ts)$/i, /routes?\//i,
];

const NAME_SIGNAL = [
  [/p0|hotfix|urgent|security|safety|cve/i, 3],
  [/fix|patch|repair/i, 1],
  [/spike|poc|experiment|try|scratch|test-/i, -2],
  [/backup|wip/i, -1],
];

export function pathSensitivity(files = []) {
  let hits = 0;
  for (const f of files) if (SENSITIVE.some((rx) => rx.test(f))) hits++;
  return hits;
}

export function nameSignal(ref = '') {
  let score = 0;
  for (const [rx, w] of NAME_SIGNAL) if (rx.test(ref)) score += w;
  return score;
}

/**
 * Rank score. `realCommits` is the cherry-absent count -- NEVER `ahead`, and
 * never upstream:track. Recency in days, decayed.
 */
export function rankScore(rec, item, now = Date.now()) {
  const sens = pathSensitivity(rec.files);
  const name = nameSignal(item.ref ?? '');
  const ageDays = item.lastCommitAt ? (now / 1000 - item.lastCommitAt) / 86400 : 999;
  const recency = Math.max(0, 30 - ageDays) / 10;
  const real = rec.realCommits ?? 0;
  const ageDecay = Math.min(6, ageDays / 30);
  return sens * 3 + name * 2 + recency + Math.log1p(real) - ageDecay;
}

const WIP_MARKERS = /\b(wip|todo|fixme|slice \d+ of \d+|part \d+ of \d+|do not merge)\b/i;

/**
 * Assign a verdict from cheap signals only. Deep verdicts (genuine-upgrade,
 * regression-risk, conflicting) require the Phase-3 evidence pass and are
 * DELIBERATELY not reachable here -- cheap signals may never authorise a merge.
 */
export function assignVerdict(rec, item, { subjects = [] } = {}) {
  if (item.laneLocked || item.inWorktree) return VERDICT.ACTIVE_LANE;

  const fresh = item.lastCommitAt && (Date.now() / 1000 - item.lastCommitAt) < 48 * 3600;
  if (fresh && rec.equivalence !== EQUIV.LANDED) return VERDICT.ACTIVE_LANE;

  // LANDED is safe to retire ONLY when content-proven (HIGH confidence).
  // A patch-id-only LANDED (cherry absent===0, MEDIUM) can be an
  // apply-then-revert: main applied the fix and backed it out, so the branch
  // holds the only live copy while the report says "already on main".
  // Anything less than HIGH goes to a human.
  if (rec.equivalence === EQUIV.LANDED) {
    if (rec.confidence === CONF.HIGH && !rec.needsContentConfirm) return VERDICT.LANDED;
    rec.signals?.push('landed-by-patch-id-UNCONFIRMED');
    return VERDICT.CONFLICTING;
  }
  if (rec.equivalence === EQUIV.UNKNOWN) return VERDICT.UNKNOWN;
  if (rec.confidence === CONF.LOW) return VERDICT.UNKNOWN;

  // ---------------------------------------------------------------------------
  // SENSITIVITY FLOOR -- must run BEFORE any archive/park verdict.
  //
  // Everything below this point can retire genuinely-absent work. If that work
  // touches auth/payment/admin/security, retiring it is how a real fix dies
  // quietly. The first live run of this engine labelled a branch named
  // "storefront-special-leak" -- 3 absent commits touching cartRoutes.mjs and
  // v2PaymentRoutes.mjs -- as [ARCHIVE] unmergeable-by-cost, because this check
  // existed as a helper and was never wired in. That is the exact
  // "skill facilitates the abandonment while feeling productive" failure the
  // design panel predicted. Sensitive work ESCALATES; it never ages out.
  // ---------------------------------------------------------------------------
  if (neverAgeOut(rec, item) && (rec.realCommits ?? 0) > 0) {
    return VERDICT.CONFLICTING;   // = [HUMAN]; never auto-retired
  }

  if (/(^|\/)(spike|poc|experiment)/i.test(item.ref ?? '') || nameSignal(item.ref) <= -2) {
    return VERDICT.EXPERIMENTAL;
  }

  const wipHits = subjects.filter((s) => WIP_MARKERS.test(s)).length;
  if (wipHits >= 2) return VERDICT.WIP;

  // Far behind + small real delta => rebase costs more than rewriting.
  if ((rec.behind ?? 0) > 500 && (rec.realCommits ?? 0) <= 3) return VERDICT.COST;

  // Everything surviving to here is a CANDIDATE only. Never an approval.
  return VERDICT.UNKNOWN;
}

/**
 * Sensitive work must never age out quietly -- it escalates instead.
 *
 * FAIL-CLOSED: if the file list could not be determined (diffStat failed), we
 * cannot prove the work is harmless, so it is treated as sensitive. Previously
 * a failed diffStat left `files` empty, pathSensitivity returned 0, the floor
 * silently disengaged, and possibly-sensitive work became an archive
 * recommendation -- a failure rendered as a confident answer.
 */
export function neverAgeOut(rec, item) {
  if (rec.filesUnknown) return true;
  if (rec.needsContentConfirm) return true;       // shipped-ness not established
  if (rec.contentCheck?.failed) return true;
  if (rec.contentCheck?.truncated) return true;   // partial view != clean view
  if (pathSensitivity(rec.files) > 0) return true;
  // Branch-name signals. Kept in sync with NAME_SIGNAL's positive terms.
  return /p0|p1|security|safety|auth|payment|stripe|cve|hotfix|urgent|leak|vuln|priv|admin|billing|cart|checkout|pii/i
    .test(item.ref ?? '');
}

export function rankAll(records, now = Date.now()) {
  for (const r of records) {
    if (!r || !r.rec) continue;
    r.score = rankScore(r.rec, r.item, now);
  }
  return records
    .filter(Boolean)
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
}
