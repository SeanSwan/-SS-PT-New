/**
 * training-tier-gate.mjs — fail-closed containment for LLM tiers that TRAIN on you.
 * ================================================================================
 * Split out of redact-egress.mjs on 2026-09-03 (SWA-236) once it outgrew that file.
 * It is a genuinely separate concern: redact-egress removes SHAPES it recognises
 * from an outbound body; this decides whether a body may be sent AT ALL. The arming
 * state stays module-local exactly as it was there, so it is still unforgeable from
 * outside. redact-egress re-exports this whole surface, so no caller changed.
 *
 * THE CONTROL IS assertTrainingTierArmed(), called by fetchForEgress immediately
 * before the socket — a caller that never heard of this file is still refused.
 */
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

/* =========================================================================
 * TRAINING-TIER GATE (added 2026-09-02 — Muse Spark contributor seat)
 * =========================================================================
 * Meta sells `meta/muse-spark-1.3-contributor` at $0.10/$0.20 per M — 12.5x
 * cheaper than its standard tier — explicitly in exchange for training future
 * models on the prompts and completions. Meta's own docs name what does NOT
 * belong there: "client repositories, personal data, secrets, unreleased
 * product logic, and material under NDA."
 *
 * WHY THIS IS A DIFFERENT PROBLEM FROM A SECRET LEAK. A leaked key is bad and
 * rotatable. Proprietary source absorbed into a foundation model's weights is
 * neither detectable nor reversible — there is no rotation. So this gate is
 * FAIL-CLOSED on content, unlike the redactor above (which is fail-closed on
 * its own instrument but permissive about content by design).
 *
 * WHY AN ALLOWLIST, NOT A DENYLIST. This module's own header records the
 * incident that a content scan returned "no matches" on a file that
 * demonstrably contained the string. A denylist of "sensitive-looking" content
 * fails open the same way. So the contributor tier accepts nothing by default
 * and only what Sean has explicitly named.
 *
 * WHY ARMING RATHER THAN A FLAG. A `--i-accept-training` flag inside one script
 * is bypassed by writing a second script — precisely the reasoning already
 * recorded for assertNotResoldSubscriptionSeat. So the gate sits at the socket:
 * any contributor-tier request whose caller did not pass through
 * armTrainingTierEgress() in this process is refused, no matter which script
 * issued it or when that script was written.
 */

/** Set by armTrainingTierEgress(); module-local, not forgeable from elsewhere. */
let trainingTierArmedUntil = 0;

/** Repo-relative path prefixes Sean has explicitly cleared for the training tier. */
export function trainingTierAllowlist() {
  return String(process.env.SWAN_TRAINING_TIER_ALLOWLIST || '')
    .split(',')
    .map((entry) => entry.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter(Boolean);
}

/**
 * OpenRouter appends VARIANT suffixes after a model id (":free", ":online",
 * ":extended", ":nitro"). An anchored `-contributor$` test therefore lets
 * "meta/muse-spark-1.3-contributor:free" straight through to the very same
 * training weights, so the variant is stripped before the test.
 * (Found 2026-09-03 by Muse Spark itself, reviewing this gate.)
 */
export function isTrainingTierModel(model) {
  const id = String(model || '').trim().toLowerCase().split(':')[0];
  return /-contributor$/.test(id);
}

/**
 * Last-resort marker for a body this gate could not parse. Deliberately looser
 * than isTrainingTierModel: when the structure is unknown, the mere presence of
 * the string is enough to demand an arming.
 */
const TRAINING_TIER_MARKER = /-contributor\b/i;

/**
 * Clear a specific set of source documents for one training-tier call.
 * Throws unless EVERY path sits under an allowlisted prefix. Arms for `ttlMs`
 * so an arming cannot silently authorise a later, unrelated call in a
 * long-running process.
 */
export function armTrainingTierEgress(paths, { ttlMs = 120_000, root = process.cwd() } = {}) {
  const given = (Array.isArray(paths) ? paths : [paths]).filter(Boolean).map(String);
  if (!given.length) {
    throw new Error('[redact-egress] training tier: refusing to arm with no named source document.');
  }

  // CANONICALISE HERE, NOT IN THE CALLER. The first version prefix-matched whatever
  // string it was handed and left realpath to consult-muse.mjs — so a symlink or
  // junction under a cleared directory was blocked only because that one caller
  // happened to resolve it, and every future caller would have been unprotected.
  // The invariant has to live in the gate; a control enforced by its callers is not
  // a control. (Found 2026-09-03 by Muse Spark reviewing this file — and it is the
  // exact mistake the arming-vs-flag comment above warns about.)
  const list = given.map((p) => {
    const abs = resolve(root, p);
    let real = abs;
    try { real = realpathSync(abs); } catch { /* nonexistent paths are rejected below or upstream */ }
    return relative(root, real).replace(/\\/g, '/');
  });
  // `relative()` returns an ABSOLUTE path when the target is on another Windows
  // drive, which no repo-relative prefix can ever match — reject rather than
  // silently compare shapes that cannot correspond.
  const offRoot = list.filter((p) => isAbsolute(p) || p === '');
  if (offRoot.length) {
    throw new Error(`[redact-egress] REFUSED: training-tier path resolves outside the repo: ${offRoot.join(', ')}`);
  }

  const allow = trainingTierAllowlist();
  if (!allow.length) {
    throw new Error(
      '[redact-egress] REFUSED: a *-contributor model trains Meta on everything you send it, and '
      + 'SWAN_TRAINING_TIER_ALLOWLIST is unset — so nothing in this repo is cleared for it. Set it to the '
      + 'specific path prefixes carrying NO client data, NO secrets and NO unreleased product logic '
      + '(e.g. SWAN_TRAINING_TIER_ALLOWLIST=docs/ai-workflow/brainstorms/public), or use --tier standard.',
    );
  }
  // Traversal is rejected before prefix-matching: "docs/pub/../../backend/x"
  // would otherwise satisfy a "docs/pub" prefix while reading backend source.
  const escaped = list.filter((p) => p.split('/').includes('..'));
  if (escaped.length) {
    throw new Error(`[redact-egress] REFUSED: training-tier path contains "..": ${escaped.join(', ')}`);
  }
  const rejected = list.filter(
    (p) => !allow.some((prefix) => p === prefix || p.startsWith(`${prefix.replace(/\/$/, '')}/`)),
  );
  if (rejected.length) {
    throw new Error(
      `[redact-egress] REFUSED: not cleared for the training tier: ${rejected.join(', ')}. `
      + `Allowlisted prefixes: ${allow.join(', ')}. Use --tier standard for anything else.`,
    );
  }
  trainingTierArmedUntil = Date.now() + ttlMs;
  console.error(
    `[redact-egress] training tier ARMED for ${list.length} cleared document(s), ${Math.round(ttlMs / 1000)}s.`,
  );
  return true;
}

/**
 * Consume the arming. Called by fetchForEgress; single-use, so one arm = one call.
 *
 * The arming is consumed by ANY outbound call, not only a training-tier one.
 * If it were consumed only on the tier it guards, a script could arm for cleared
 * document A, make an unrelated standard-tier call, and then have the still-live
 * arming authorise a second contributor call carrying document B that was never
 * cleared. consult-muse.mjs makes exactly one call so it could not hit that, but
 * this is a library guard and the next caller is not bound by that shape.
 */
export function assertTrainingTierArmed(url, body) {
  const armed = trainingTierArmedUntil > Date.now();
  trainingTierArmedUntil = 0; // consumed here, whatever the outcome below

  // The host is cosmetic — it appears in the error text and decides nothing — so a
  // URL this cannot parse must never be a reason to ALLOW. The previous version
  // returned here, which meant a relative URL or a Request object skipped the whole
  // check while still satisfying fetchForEgress's string-body requirement.
  let host = '(unparseable url)';
  try { host = new URL(url).host.toLowerCase(); } catch { /* decides nothing */ }

  const raw = String(body ?? '');
  let named = null; // null === structure could not be read
  try {
    const parsed = JSON.parse(raw);
    // OpenRouter accepts a `models` FALLBACK ARRAY alongside `model`. A gate that
    // reads only `model` is bypassed by naming a safe primary and putting the
    // training tier in the fallback list, where the request may well end up.
    named = [parsed?.model, ...(Array.isArray(parsed?.models) ? parsed.models : [])]
      .filter((entry) => typeof entry === 'string');
  } catch { named = null; }

  // FAIL CLOSED on an unreadable body. The old `catch { return }` allowed it —
  // the one fail-open branch in a gate whose entire premise is that this tier has
  // no undo. If the structure cannot be read, the raw text decides instead.
  const suspect = named === null
    ? TRAINING_TIER_MARKER.test(raw)
    : named.some(isTrainingTierModel);
  if (!suspect) return;
  if (armed) return;

  const model = named === null ? '(unparseable body)' : named.find(isTrainingTierModel);
  throw new Error(
    `[redact-egress] REFUSED: "${model}" (host ${host}) is a TRAINING tier — Meta trains on both the prompt `
    + 'and the completion, and that is not reversible. This call did not pass armTrainingTierEgress(), so '
    + 'nothing proved its contents are cleared. Use the standard tier (drop the "-contributor" suffix), or '
    + 'route through scripts/consult-muse.mjs --tier contributor with SWAN_TRAINING_TIER_ALLOWLIST set.',
  );
}
