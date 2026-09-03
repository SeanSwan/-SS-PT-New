/**
 * redact-egress.mjs — the last gate before a document leaves this machine.
 * =======================================================================
 * WHY THIS EXISTS (2026-08-22 incident, handoff v5 §4):
 * A review packet dispatched to six external vendors carried the operator's
 * Windows username inside filesystem paths. A secret scan had been run before
 * dispatch and returned "No matches found" — on a file that demonstrably
 * contained the string. **The instrument produced a false negative and it was
 * believed.** Scope, once measured: 59 documents, 140 occurrences, months old.
 *
 * REVISED 2026-08-26 (Fable review, EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23):
 * the first version gated the *file read*; callers then assembled diffs,
 * prompts, seeds and even the redactor's own ENOENT messages around it and
 * sent those raw. The gate now sits at the TRANSPORT: `fetchForEgress()`
 * redacts the final request body immediately before the socket. Per-read
 * helpers remain for early, labelled reporting — they are defense in depth,
 * not the control.
 *
 * THE CANARY IS A POSITIVE CONTROL ON THE INSTRUMENT, NOT A COVERAGE PROOF.
 * Before redacting anything real, every call plants one sample of EVERY shape
 * it knows (identity, hostname, each secret family) and verifies each was
 * caught. That proves the instrument is live and every pattern fires in this
 * process. Coverage — whether a class nobody thought of leaks — lives in the
 * test corpus and the threat model (accidental leakage by cooperative authors;
 * regex is the right tool for that and the wrong tool for adversarial exfil).
 *
 * Identity is derived at runtime (os.userInfo / homedir / hostname), never
 * hardcoded — hardcoding the operator's name here would make THIS FILE the leak.
 */
import { readFileSync } from 'node:fs';
import { homedir, hostname, userInfo } from 'node:os';
import { basename } from 'node:path';

/**
 * Canary samples are assembled from parts so this source file never contains a
 * literal key-shaped string: the pre-commit secret scanner (rightly) cannot tell
 * a canary from a leak, and an allowlist for this file would be a bigger hole.
 */
const c = (...parts) => parts.join('');

/**
 * Secret-shaped values: [regex, replacement, canary sample]. Redacted wherever
 * they appear, key name irrelevant. Every row's sample is planted by selfTest().
 */
const SECRET_SHAPES = [
  [/sk-[A-Za-z0-9_-]{12,}/g, '<REDACTED-KEY>', c('sk-', 'CANARYCANARYCANARY123456')],
  [/sk_(live|test)_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('sk_', 'live_', 'CANARY0123456789')],
  [/rk_live_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('rk_', 'live_', 'CANARY0123456789')],
  [/whsec_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('whsec', '_CANARY0123456789')],
  [/xoxb-[A-Za-z0-9-]{8,}/g, '<REDACTED-KEY>', c('xoxb', '-CANARY-0123456789')],
  [/AIza[A-Za-z0-9_-]{20,}/g, '<REDACTED-KEY>', 'AIzaCANARYCANARYCANARY0123456789'],
  [/rnd_[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'rnd_CANARYCANARYCANARY0123'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'ghp_CANARYCANARYCANARY0123456789'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '<REDACTED-KEY>', 'github_pat_CANARYCANARYCANARY0123'],
  [/SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'SG.CANARYCANARYCANARY01.CANARYCANARYCANARY02'],
  [/lin_api_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'lin_api_CANARYCANARYCANARY0123'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>', 'eyJCANARYCANARY.eyJCANARYCANARY.CANARY'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer <REDACTED-KEY>', 'Bearer CANARYCANARYCANARY0123'],
  [/\b\d{8,}:[A-Za-z0-9_-]{30,}\b/g, '<REDACTED-BOT-TOKEN>', '12345678:CANARYCANARYCANARYCANARYCANARY01'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED-PEM>',
    '-----BEGIN PRIVATE KEY-----\nCANARY\n-----END PRIVATE KEY-----'],
  [/(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|amqps?):\/\/[^\s"'<>]+/gi, '<REDACTED-DB-URL>',
    c('postgresql:', '//canary:canary@canary.invalid:5432/canary')],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<REDACTED-EMAIL>', 'canary@canary.invalid'],
  [/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '<REDACTED-PHONE>', '(555) 000-0199'],
  // Rule 47 numeric IDs (Telegram chat_id etc): keyed at 7+ digits, bare only
  // at 10+ so all-digit 9-char commit SHAs and 20260826T… timestamps survive.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)(\s*[=:]\s*)-?\d{7,}\b/gi, '$1$2<REDACTED-ID>', 'chat_id=1234567'],
  [/(?<![\w.-])-?\d{10,}(?![\w.-])/g, '<REDACTED-ID>', '9876543210'],
];

/** Names that are also ordinary words: redact with boundaries instead of corrupting prose. */
const COMMON_WORD_NAMES = new Set([
  'admin', 'administrator', 'user', 'users', 'root', 'dev', 'developer', 'test', 'guest',
  'owner', 'default', 'public', 'home', 'desktop', 'server', 'local', 'localhost', 'ubuntu',
  'runner', 'node', 'docker', 'system', 'pi', 'me', 'main',
]);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Identity-bearing names, derived from the RUNTIME environment. */
export function identityNames() {
  const user = (userInfo().username || '').trim();
  const winUser = basename(homedir() || '') || '';
  let host = '';
  try { host = (hostname() || '').trim(); } catch { host = ''; }
  return [...new Set([user, winUser, host].filter((n) => n && n.length >= 3 && n.toLowerCase() !== 'localhost'))];
}

/** Identity-bearing patterns, built from the RUNTIME environment. */
function identityPatterns() {
  // Paths must be redacted before their identity-bearing segments. If names run
  // first, `C:\\Users\\operator` becomes `C:\\Users\\<OPERATOR>` and the path
  // rule can no longer prove or replace the absolute prefix. Match one or two
  // backslashes so the same rule covers raw text and JSON-stringified bodies.
  const out = [
    [/\/mnt\/[a-z]\/Users\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
    [/[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\\/\s"'<>]+/g, '<PATH>'],
    [/\/(?:home|Users)\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
  ];
  for (const name of identityNames()) {
    const esc = escapeRe(name);
    const re = COMMON_WORD_NAMES.has(name.toLowerCase())
      ? new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'gi')
      : new RegExp(esc, 'gi');
    out.push([re, '<OPERATOR>']);
  }
  return out;
}

function applyAll(text, patterns) {
  let out = text;
  const hits = [];
  for (const [re, repl] of patterns) {
    const m = out.match(re);
    if (m && m.length) hits.push({ replacement: repl, count: m.length });
    out = out.replace(re, repl);
  }
  return { out, hits };
}

/**
 * Prove the instrument is live: plant one sample of every known shape plus
 * the runtime identity, and verify each was caught. Throws rather than
 * returning a reassuring boolean — a caller can ignore a boolean; it cannot
 * ignore a throw. This certifies the instrument, NOT coverage.
 */
export function selfTest() {
  const names = identityNames();
  const user = basename(homedir() || '') || userInfo().username || '';
  if (!user || user.length < 3 || !names.length) {
    throw new Error(
      '[redact-egress] CANARY IMPOSSIBLE: cannot derive an operator identity from the ' +
      'runtime environment, so the redactor cannot be proven. Refusing to certify this ' +
      'document as safe to send.',
    );
  }
  const identityCanary = names.map((n) => `/home/${n}/x C:\\Users\\${n}\\y host=${n}`).join(' ');
  const canary = `canary ${identityCanary} ${SECRET_SHAPES.map((s) => s[2]).join(' ')}`;
  const { out } = applyAll(canary, [...identityPatterns(), ...SECRET_SHAPES]);
  const leaked = [];
  for (const n of names) if (out.toLowerCase().includes(n.toLowerCase())) leaked.push(`identity:${n.length}ch`);
  for (const [, repl, sample] of SECRET_SHAPES) {
    const probe = sample.split('\n')[0].slice(0, 12);
    if (out.includes(probe)) leaked.push(`shape:${repl}`);
  }
  if (leaked.length) {
    throw new Error(
      `[redact-egress] CANARY FAILED — the instrument did not catch: ${leaked.join(', ')}. ` +
      'Its silence about this document means NOTHING. Refusing to send.',
    );
  }
  return true;
}

/**
 * Redact `text` for egress. Runs the canary first, every time.
 * @returns {{text: string, hits: Array<{replacement: string, count: number}>}}
 */
export function redactForEgress(text) {
  selfTest();
  const { out, hits } = applyAll(String(text ?? ''), [...identityPatterns(), ...SECRET_SHAPES]);
  return { text: out, hits };
}

function report(label, hits) {
  if (hits.length) {
    const total = hits.reduce((n, h) => n + h.count, 0);
    console.error(`[redact-egress] ${label}: ${total} redaction(s) before send — ` +
      hits.map((h) => `${h.replacement}×${h.count}`).join(', '));
  } else {
    console.error(`[redact-egress] ${label}: no matches (instrument live; coverage per test corpus)`);
  }
}

/** Redact and report in one call; returns the redacted string. */
export function redactOutbound(text, { label = 'outbound', quiet = false } = {}) {
  const { text: out, hits } = redactForEgress(text);
  if (!quiet) report(label, hits);
  return out;
}

/**
 * Drop-in replacement for `readFileSync(path, 'utf-8')` on any document that is
 * about to be sent to an external model. Reports what it removed on stderr —
 * silent redaction is how you stop noticing that documents keep needing it.
 * A read failure is rethrown with a REDACTED message: Node's ENOENT text
 * carries the absolute path, which is the incident class this module exists for.
 */
export function readForEgress(path, opts = {}) {
  const { label = 'document', quiet = false } = typeof opts === 'object' && opts ? opts : {};
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    const e = new Error(`[redact-egress] read failed (${err.code || 'ERR'}): ${redactForEgress(err.message).text}`);
    e.code = err.code;
    throw e;
  }
  return redactOutbound(raw, { label, quiet });
}

/**
 * THE CONTROL. Drop-in for `fetch(url, init)` on any request that leaves this
 * machine: the string `init.body` is redacted immediately before the socket,
 * so diffs, prompts, seeds and error strings assembled around a document get
 * the same treatment the document did. Headers are untouched (the API key
 * lives there and belongs there). Canary failure throws → nothing is sent.
 */
/**
 * Seats that must never be reached through a paid reseller.
 *
 * Sean holds a Z.ai subscription that already includes BOTH glm-5.3 and glm-5.3-flash,
 * so routing either one through OpenRouter pays per-token for something already bought.
 * This lives at the egress chokepoint rather than in a doc because every consult script
 * funnels through here: a prose rule has to be remembered by each new script and each
 * new agent, and this project's own corpus records prose rules being violated four times
 * in one session after being written up. A refusal cannot be forgotten.
 */
const SUBSCRIPTION_ONLY_MODEL_PREFIXES = [
  { prefix: 'z-ai/', seat: 'GLM (glm-5.3, glm-5.3-flash)', use: 'node scripts/consult-glm.mjs --model glm-5.3[-flash]' }
];

export function assertNotResoldSubscriptionSeat(url, body) {
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return; }
  if (!host.includes('openrouter')) return;

  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return; }
  if (!model) return;

  const hit = SUBSCRIPTION_ONLY_MODEL_PREFIXES.find((entry) => model.toLowerCase().startsWith(entry.prefix));
  if (!hit) return;

  throw new Error(
    `[redact-egress] REFUSED: "${model}" via OpenRouter. The ${hit.seat} seat is covered by the ` +
    `Z.ai subscription and must go direct, not through a paid reseller. Use: ${hit.use}`
  );
}

export async function fetchForEgress(url, init = {}, { label = 'request', quiet = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof init.body !== 'string') {
    throw new Error('[redact-egress] fetchForEgress requires a string body (JSON.stringify it first); refusing to send an unredactable body.');
  }
  assertNotResoldSubscriptionSeat(url, init.body);
  assertTrainingTierArmed(url, init.body);
  const body = redactOutbound(init.body, { label, quiet });
  return fetchImpl(url, { ...init, body });
}

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

export function isTrainingTierModel(model) {
  return /-contributor$/i.test(String(model || '').trim());
}

/**
 * Clear a specific set of source documents for one training-tier call.
 * Throws unless EVERY path sits under an allowlisted prefix. Arms for `ttlMs`
 * so an arming cannot silently authorise a later, unrelated call in a
 * long-running process.
 */
export function armTrainingTierEgress(paths, { ttlMs = 120_000 } = {}) {
  const list = (Array.isArray(paths) ? paths : [paths])
    .filter(Boolean)
    .map((p) => String(p).replace(/\\/g, '/').replace(/^\.\//, ''));
  if (!list.length) {
    throw new Error('[redact-egress] training tier: refusing to arm with no named source document.');
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

  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return; }
  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return; }
  if (!isTrainingTierModel(model)) return;
  if (armed) return;
  throw new Error(
    `[redact-egress] REFUSED: "${model}" (host ${host}) is a TRAINING tier — Meta trains on both the prompt `
    + 'and the completion, and that is not reversible. This call did not pass armTrainingTierEgress(), so '
    + 'nothing proved its contents are cleared. Use the standard tier (drop the "-contributor" suffix), or '
    + 'route through scripts/consult-muse.mjs --tier contributor with SWAN_TRAINING_TIER_ALLOWLIST set.',
  );
}

export default {
  readForEgress, redactForEgress, redactOutbound, fetchForEgress,
  assertNotResoldSubscriptionSeat, selfTest, identityNames,
  armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist,
};
